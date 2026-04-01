'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import {
  LucideBluetooth, LucideBluetoothOff, LucideBluetoothConnected,
  LucideScale, LucideLoader2, LucideCheck, LucideRefreshCw,
  LucideAlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

/**
 * Known Bluetooth GATT service/characteristic UUIDs for weight scales.
 *
 * Most BLE-enabled scales (A&D, Ohaus, generic Chinese) expose weight via the
 * "Weight Scale" service (0x181D) or a vendor-specific service.
 * The "Weight Measurement" characteristic (0x2A9D) streams weight readings.
 *
 * For scales that don't follow the standard, we also try common custom UUIDs.
 */
const WEIGHT_SCALE_SERVICE = 0x181d
const WEIGHT_MEASUREMENT_CHAR = 0x2a9d

// Common vendor services (fallbacks for non-standard scales)
const VENDOR_SERVICES = [
  '0000fff0-0000-1000-8000-00805f9b34fb', // Generic Chinese BLE scales
  '0000ffe0-0000-1000-8000-00805f9b34fb', // Another common vendor UUID
]

const ALL_SERVICES = [WEIGHT_SCALE_SERVICE, ...VENDOR_SERVICES]

export interface ScaleReading {
  weight: number
  unit: 'kg' | 'lbs' | 'oz' | 'g'
  stable: boolean
  timestamp: number
}

interface BluetoothScaleProps {
  /** Called when a stable reading is captured */
  onWeightCaptured?: (reading: ScaleReading) => void
  /** Additional css */
  className?: string
  /** Compact mode for embedding in inventory row */
  compact?: boolean
}

/**
 * Parses a BLE weight measurement packet.
 * IEEE 11073 / Bluetooth Weight Scale Profile format:
 * Byte 0: Flags (bit 0 = imperial units, bit 1 = timestamp, bit 2 = user ID, bit 3 = BMI/height)
 * Bytes 1-2: Weight (uint16, little-endian)
 * Unit: If flags bit 0 = 0 → kg (resolution 0.005), if = 1 → lbs (resolution 0.01)
 */
function parseWeightMeasurement(dataView: DataView): ScaleReading {
  const flags = dataView.getUint8(0)
  const isImperial = (flags & 0x01) !== 0

  const rawWeight = dataView.getUint16(1, true)

  let weight: number
  let unit: ScaleReading['unit']

  if (isImperial) {
    weight = rawWeight * 0.01 // lbs resolution
    unit = 'lbs'
  } else {
    weight = rawWeight * 0.005 // kg resolution
    unit = 'kg'
  }

  // Bit 2 of measurement status flags (if present) = stable
  const stable = dataView.byteLength > 3
    ? (dataView.getUint8(3) & 0x04) === 0
    : weight > 0

  return {
    weight: Math.round(weight * 100) / 100,
    unit,
    stable,
    timestamp: Date.now(),
  }
}

/**
 * Fallback parser for non-standard BLE scales that send ASCII text.
 * Many cheap scales just stream weight as ASCII: e.g. "  123.4 g\r\n"
 */
function parseAsciiWeight(dataView: DataView): ScaleReading | null {
  try {
    const decoder = new TextDecoder()
    const text = decoder.decode(dataView.buffer).trim()

    // Match patterns like "123.4", "  45.6 g", "78.9 kg", "12.3 lbs"
    const match = text.match(/([\d.]+)\s*(g|kg|lbs|oz|lb)?/i)
    if (!match) return null

    const weight = parseFloat(match[1])
    if (isNaN(weight)) return null

    let unit: ScaleReading['unit'] = 'g'
    const rawUnit = (match[2] || 'g').toLowerCase()
    if (rawUnit === 'kg') unit = 'kg'
    else if (rawUnit === 'lbs' || rawUnit === 'lb') unit = 'lbs'
    else if (rawUnit === 'oz') unit = 'oz'
    else unit = 'g'

    // Convert grams to kg for consistency
    const normalizedWeight = unit === 'g'
      ? Math.round(weight / 10) / 100 // g → kg
      : Math.round(weight * 100) / 100

    if (unit === 'g') unit = 'kg'

    return {
      weight: normalizedWeight,
      unit,
      stable: true,
      timestamp: Date.now(),
    }
  } catch {
    return null
  }
}

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error'

export function BluetoothScale({ onWeightCaptured, className, compact = false }: BluetoothScaleProps) {
  const [state, setState] = useState<ConnectionState>('disconnected')
  const [reading, setReading] = useState<ScaleReading | null>(null)
  const [deviceName, setDeviceName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSupported, setIsSupported] = useState(true)

  const deviceRef = useRef<BluetoothDevice | null>(null)
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)

  useEffect(() => {
    if (typeof navigator !== 'undefined' && !navigator.bluetooth) {
      setIsSupported(false)
    }
  }, [])

  const handleNotification = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic
    const value = target.value
    if (!value) return

    // Try standard BLE weight measurement first
    let parsed: ScaleReading | null = null
    try {
      parsed = parseWeightMeasurement(value)
    } catch {
      // Try ASCII fallback
      parsed = parseAsciiWeight(value)
    }

    if (parsed && parsed.weight > 0) {
      setReading(parsed)
    }
  }, [])

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth not supported in this browser')
      setState('error')
      return
    }

    setState('connecting')
    setError(null)

    try {
      // Request device with weight scale service
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [WEIGHT_SCALE_SERVICE] },
        ],
        optionalServices: VENDOR_SERVICES,
        // Fallback: accept any device if no standard scales found
        // acceptAllDevices: true,
      }).catch(async () => {
        // If no standard scale found, try accepting all devices
        return navigator.bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: ALL_SERVICES,
        })
      })

      if (!device) {
        setState('disconnected')
        return
      }

      deviceRef.current = device
      setDeviceName(device.name || 'BLE Scale')

      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setState('disconnected')
        setReading(null)
        setDeviceName(null)
        toast.info('Scale disconnected')
      })

      // Connect to GATT server
      const server = await device.gatt!.connect()

      // Try standard weight service first, then vendor services
      let characteristic: BluetoothRemoteGATTCharacteristic | null = null

      for (const serviceUuid of ALL_SERVICES) {
        try {
          const service = await server.getPrimaryService(serviceUuid)
          const chars = await service.getCharacteristics()

          // Look for a notifiable characteristic
          for (const char of chars) {
            if (char.properties.notify || char.properties.indicate) {
              characteristic = char
              break
            }
          }
          if (characteristic) break
        } catch {
          // Service not found, try next
          continue
        }
      }

      if (!characteristic) {
        throw new Error('No compatible weight characteristic found on this device')
      }

      characteristicRef.current = characteristic

      // Subscribe to notifications
      characteristic.addEventListener('characteristicvaluechanged', handleNotification)
      await characteristic.startNotifications()

      setState('connected')
      toast.success(`Connected to ${device.name || 'BLE Scale'}`)
    } catch (err: any) {
      if (err?.name === 'NotFoundError' || err?.message?.includes('cancelled')) {
        // User cancelled the picker
        setState('disconnected')
        return
      }
      console.error('BLE connection error:', err)
      setError(err?.message || 'Connection failed')
      setState('error')
      toast.error('Scale connection failed')
    }
  }, [handleNotification])

  const disconnect = useCallback(async () => {
    try {
      if (characteristicRef.current) {
        characteristicRef.current.removeEventListener(
          'characteristicvaluechanged',
          handleNotification
        )
        try {
          await characteristicRef.current.stopNotifications()
        } catch { /* ignore */ }
      }
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect()
      }
    } catch { /* ignore */ }

    deviceRef.current = null
    characteristicRef.current = null
    setState('disconnected')
    setReading(null)
    setDeviceName(null)
  }, [handleNotification])

  const captureReading = useCallback(() => {
    if (reading && onWeightCaptured) {
      onWeightCaptured(reading)
      toast.success(`Captured: ${reading.weight} ${reading.unit}`)
    }
  }, [reading, onWeightCaptured])

  // Browser doesn't support Web Bluetooth
  if (!isSupported) {
    if (compact) return null
    return (
      <div className={cn('rounded-2xl border border-white/5 bg-white/[0.01] p-6', className)}>
        <div className="flex items-center gap-3 text-zinc-600">
          <LucideBluetoothOff className="h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-bold text-zinc-500">Bluetooth Not Available</p>
            <p className="text-xs font-medium text-zinc-700 mt-0.5">
              Use Chrome or Edge on desktop/Android for BLE scale support.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── Compact mode (for embedding in inventory row or modal) ──
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        {state === 'disconnected' && (
          <button
            onClick={connect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black uppercase tracking-widest text-blue-400 hover:bg-blue-500/20 transition-colors"
          >
            <LucideBluetooth className="h-3 w-3" />
            Scale
          </button>
        )}
        {state === 'connecting' && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <LucideLoader2 className="h-3 w-3 animate-spin text-blue-400" />
            <span className="text-[10px] font-bold text-blue-400">Pairing…</span>
          </div>
        )}
        {state === 'connected' && reading && (
          <button
            onClick={captureReading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-colors"
          >
            <LucideScale className="h-3 w-3" />
            <span className="text-xs font-mono font-black">{reading.weight}</span>
            <span className="text-[9px] font-bold uppercase">{reading.unit}</span>
          </button>
        )}
        {state === 'connected' && !reading && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20">
            <LucideBluetoothConnected className="h-3 w-3 text-green-400" />
            <span className="text-[10px] font-bold text-green-400">Waiting…</span>
          </div>
        )}
        {state === 'error' && (
          <button
            onClick={connect}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-[10px] font-bold text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <LucideAlertCircle className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    )
  }

  // ── Full-size card ──
  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-all duration-300',
      state === 'connected'
        ? 'border-green-500/20 bg-green-500/[0.02]'
        : state === 'error'
          ? 'border-red-500/20 bg-red-500/[0.02]'
          : 'border-white/5 bg-white/[0.01]',
      className
    )}>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              'h-10 w-10 rounded-xl flex items-center justify-center border transition-all',
              state === 'connected'
                ? 'bg-green-500/10 border-green-500/20'
                : state === 'connecting'
                  ? 'bg-blue-500/10 border-blue-500/20'
                  : 'bg-white/5 border-white/5'
            )}>
              {state === 'connecting' ? (
                <LucideLoader2 className="h-5 w-5 animate-spin text-blue-400" />
              ) : state === 'connected' ? (
                <LucideBluetoothConnected className="h-5 w-5 text-green-400" />
              ) : (
                <LucideBluetooth className="h-5 w-5 text-zinc-500" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white">
                {state === 'connected' ? deviceName : 'BLE Scale'}
              </h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">
                {state === 'disconnected' && 'Not Connected'}
                {state === 'connecting' && 'Pairing…'}
                {state === 'connected' && 'Streaming'}
                {state === 'error' && 'Connection Failed'}
              </p>
            </div>
          </div>

          {/* Connection toggle */}
          {state === 'disconnected' || state === 'error' ? (
            <Button
              onClick={connect}
              size="sm"
              className="gap-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300"
              variant="ghost"
            >
              <LucideBluetooth className="h-3.5 w-3.5" />
              Pair Scale
            </Button>
          ) : state === 'connected' ? (
            <Button
              onClick={disconnect}
              size="sm"
              variant="ghost"
              className="gap-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            >
              <LucideBluetoothOff className="h-3.5 w-3.5" />
              Disconnect
            </Button>
          ) : null}
        </div>

        {/* Error display */}
        {state === 'error' && error && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
            <LucideAlertCircle className="h-4 w-4 text-red-400 shrink-0" />
            <p className="text-xs font-bold text-red-400">{error}</p>
          </div>
        )}

        {/* Live weight display */}
        {state === 'connected' && (
          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-black/30 border border-white/5 text-center">
              {reading ? (
                <div className="space-y-1">
                  <div className="flex items-baseline justify-center gap-2">
                    <span className="text-5xl font-black font-mono tracking-tighter text-white tabular-nums">
                      {reading.weight.toFixed(2)}
                    </span>
                    <span className="text-lg font-bold uppercase text-zinc-500">
                      {reading.unit}
                    </span>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {reading.stable ? (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-green-400">
                        <LucideCheck className="h-3 w-3" />
                        Stable
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-yellow-400 animate-pulse">
                        <LucideRefreshCw className="h-3 w-3 animate-spin" />
                        Settling
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2 py-2">
                  <LucideScale className="h-8 w-8 text-zinc-700 mx-auto" />
                  <p className="text-xs font-bold text-zinc-600">Waiting for weight data…</p>
                  <p className="text-[10px] text-zinc-700 font-medium">Place an item on the scale</p>
                </div>
              )}
            </div>

            {/* Capture button */}
            {reading && onWeightCaptured && (
              <Button
                onClick={captureReading}
                className="w-full gap-2 bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 hover:text-green-300"
                variant="ghost"
                size="lg"
              >
                <LucideCheck className="h-4 w-4" />
                Capture {reading.weight} {reading.unit}
              </Button>
            )}
          </div>
        )}

        {/* Info when disconnected */}
        {state === 'disconnected' && (
          <div className="p-4 rounded-xl bg-white/[0.01] border border-white/5 space-y-2">
            <p className="text-xs font-bold text-zinc-500">Compatible Scales</p>
            <ul className="space-y-1 text-[11px] text-zinc-600 font-medium">
              <li className="flex items-center gap-2">
                <span className="text-blue-400">•</span>
                A&D FX-i / FZ-i series (Bluetooth)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">•</span>
                Ohaus Scout / Navigator BLE models
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-400">•</span>
                Any BLE scale with Weight Scale Profile (0x181D)
              </li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
