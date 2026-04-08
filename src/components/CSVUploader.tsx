'use client'

import { useState } from 'react'
import Papa from 'papaparse'
import { Card, CardContent } from '@/components/ui/card'
import { LucideFileSpreadsheet, LucideLoader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface CSVUploaderProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onDataParsed: (data: any[]) => Promise<void>
  requiredHeaders: string[]
  optionalHeaders?: string[]
  expectedType: 'tanks' | 'inventory' | 'batches' | 'suppliers' | 'recipes'
}

export function CSVUploader({ onDataParsed, requiredHeaders, optionalHeaders, expectedType }: CSVUploaderProps) {
  const [isHovering, setIsHovering] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const processFile = (file: File) => {
    if (!file) return

    setIsLoading(true)
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const { data, meta } = results
        
        // Validate headers
        const missingHeaders = requiredHeaders.filter(h => !meta.fields?.includes(h))
        if (missingHeaders.length > 0) {
          toast.error(`Invalid CSV structure. Missing columns: ${missingHeaders.join(', ')}`)
          setIsLoading(false)
          return
        }

        try {
          await onDataParsed(data)
        } catch (e: unknown) {
          toast.error(e instanceof Error ? e.message : String(e) || 'Import failed')
        } finally {
          setIsLoading(false)
        }
      },
      error: (error) => {
        toast.error(`Failed to parse CSV: ${error.message}`)
        setIsLoading(false)
      }
    })
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsHovering(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsHovering(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsHovering(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0])
    }
  }

  return (
    <Card className="glass border-border overflow-hidden">
      <CardContent className="p-0">
        <label
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center justify-center w-full h-48 border-2 border-dashed cursor-pointer",
            "transition-all duration-200 ease-in-out",
            isHovering ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-surface",
            isLoading && "opacity-50 pointer-events-none"
          )}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            {isLoading ? (
              <LucideLoader2 className="w-10 h-10 mb-3 text-primary animate-spin" />
            ) : (
              <LucideFileSpreadsheet className="w-10 h-10 mb-3 text-muted-foreground" />
            )}
            <p className="mb-2 text-sm text-foreground font-bold">
              <span className="font-semibold text-primary">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-muted-foreground font-medium">
              CSV file configured for {expectedType}
            </p>
            <p className="text-[10px] text-muted-foreground font-mono mt-2">
              Required: {requiredHeaders.join(', ')}
            </p>
            {optionalHeaders && optionalHeaders.length > 0 && (
              <p className="text-[10px] text-muted-foreground/60 font-mono mt-0.5">
                Optional: {optionalHeaders.join(', ')}
              </p>
            )}
          </div>
          <input 
            type="file" 
            className="hidden" 
            accept=".csv"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                processFile(e.target.files[0])
              }
              // Reset so same file can be chosen again
              e.target.value = ''
            }} 
            disabled={isLoading}
          />
        </label>
      </CardContent>
    </Card>
  )
}
