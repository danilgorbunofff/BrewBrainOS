'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ActionResult, Supplier } from '@/types/database'
import { createSupplier, updateSupplier } from '@/app/actions/supplier-actions'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SubmitButton } from '@/components/SubmitButton'
import { FormWithToast } from '@/components/FormWithToast'
import { LucideArrowLeft, LucideSave } from 'lucide-react'
import Link from 'next/link'

interface SupplierFormProps {
  breweryId: string
  supplier?: Supplier
  onSuccess?: () => void
}

export function SupplierForm({ breweryId, supplier, onSuccess }: SupplierFormProps) {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const isEditing = !!supplier

  // Handle form submission
  const handleSubmit = async (formData: FormData): Promise<ActionResult> => {
    try {
      setErrors({})

      // Extract form data
      const name = formData.get('name') as string
      const supplierType = formData.get('supplier_type') as string
      const contactPerson = formData.get('contact_person') as string
      const email = formData.get('email') as string
      const phone = formData.get('phone') as string
      const address = formData.get('address') as string
      const city = formData.get('city') as string
      const state = formData.get('state') as string
      const zipCode = formData.get('zip_code') as string
      const country = formData.get('country') as string
      const website = formData.get('website') as string
      const specialty = formData.get('specialty') as string
      const yearsPartnered = formData.get('years_partnered') as string
      const notes = formData.get('notes') as string

      // Validation
      const newErrors: Record<string, string> = {}
      
      if (!name?.trim()) newErrors.name = 'Supplier name is required'
      if (!supplierType) newErrors.supplier_type = 'Supplier type is required'
      if (email && !isValidEmail(email)) newErrors.email = 'Invalid email format'
      if (phone && !isValidPhone(phone)) newErrors.phone = 'Invalid phone format'
      
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return { success: false, error: 'Please fix the errors below' }
      }

      const supplierData = {
        name: name.trim(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        supplier_type: supplierType as any,
        contact_person: contactPerson?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        city: city?.trim() || null,
        state: state?.trim() || null,
        zip_code: zipCode?.trim() || null,
        country: country?.trim() || 'USA',
        website: website?.trim() || null,
        specialty: specialty?.trim() || null,
        years_partnered: yearsPartnered ? parseInt(yearsPartnered) : null,
        notes: notes?.trim() || null,
        is_active: true,
        brewery_id: breweryId,
        avg_quality_rating: supplier?.avg_quality_rating || 0,
        avg_delivery_days: supplier?.avg_delivery_days || 0,
        total_orders: supplier?.total_orders || 0,
      }

      let result

      if (isEditing) {
        result = await updateSupplier(supplier.id, supplierData)
      } else {
        result = await createSupplier(breweryId, supplierData)
      }

      if (!result.success) {
        throw new Error(result.error)
      }

      onSuccess?.()
      router.push('/suppliers')
      return result
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Failed to save supplier' }
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <FormWithToast
        action={handleSubmit}
        successMessage={isEditing ? 'Supplier updated successfully' : 'Supplier created successfully'}
      >
        <div className="space-y-6 pb-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link href="/suppliers">
                <Button variant="ghost" size="icon">
                  <LucideArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">
                {isEditing ? 'Edit Supplier' : 'Add Supplier'}
              </h1>
            </div>
          </div>

          {/* Basic Information Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h2 className="font-bold text-lg">Basic Information</h2>

            {/* Name & Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Supplier Name *
                </label>
                <Input
                  name="name"
                  placeholder="e.g., Hop Traders Inc"
                  defaultValue={supplier?.name}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Type *
                </label>
                <select
                  name="supplier_type"
                  defaultValue={supplier?.supplier_type || ''}
                  className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800"
                >
                  <option value="">Select type</option>
                  <option value="Distributor">Distributor</option>
                  <option value="Direct">Direct</option>
                  <option value="Cooperative">Cooperative</option>
                </select>
                {errors.supplier_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.supplier_type}</p>
                )}
              </div>
            </div>

            {/* Specialty & Years */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Specialty
                </label>
                <Input
                  name="specialty"
                  placeholder="e.g., Hops, Grain, Yeast, All"
                  defaultValue={supplier?.specialty || ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Years Partnered
                </label>
                <Input
                  name="years_partnered"
                  type="number"
                  min="0"
                  placeholder="e.g., 5"
                  defaultValue={supplier?.years_partnered || ''}
                />
              </div>
            </div>
          </div>

          {/* Contact Information Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h2 className="font-bold text-lg">Contact Information</h2>

            {/* Contact Person & Email */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Contact Person
                </label>
                <Input
                  name="contact_person"
                  placeholder="Name"
                  defaultValue={supplier?.contact_person || ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Email
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  defaultValue={supplier?.email || ''}
                  className={errors.email ? 'border-red-500' : ''}
                />
                {errors.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                )}
              </div>
            </div>

            {/* Phone & Website */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Phone
                </label>
                <Input
                  name="phone"
                  placeholder="(555) 123-4567"
                  defaultValue={supplier?.phone || ''}
                  className={errors.phone ? 'border-red-500' : ''}
                />
                {errors.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Website
                </label>
                <Input
                  name="website"
                  type="url"
                  placeholder="https://example.com"
                  defaultValue={supplier?.website || ''}
                />
              </div>
            </div>
          </div>

          {/* Address Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h2 className="font-bold text-lg">Address</h2>

            {/* Address Line */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Street Address
              </label>
              <Input
                name="address"
                placeholder="123 Main St"
                defaultValue={supplier?.address || ''}
              />
            </div>

            {/* City, State, Zip */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  City
                </label>
                <Input
                  name="city"
                  placeholder="Portland"
                  defaultValue={supplier?.city || ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  State
                </label>
                <Input
                  name="state"
                  placeholder="OR"
                  maxLength={2}
                  defaultValue={supplier?.state || ''}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  ZIP Code
                </label>
                <Input
                  name="zip_code"
                  placeholder="97201"
                  defaultValue={supplier?.zip_code || ''}
                />
              </div>
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Country
              </label>
              <Input
                name="country"
                placeholder="USA"
                defaultValue={supplier?.country || 'USA'}
              />
            </div>
          </div>

          {/* Notes Section */}
          <div className="space-y-4 p-4 border rounded-lg bg-slate-50 dark:bg-slate-900">
            <h2 className="font-bold text-lg">Additional Notes</h2>

            <div>
              <label className="block text-sm font-medium mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                placeholder="Any additional information about this supplier..."
                defaultValue={supplier?.notes || ''}
                rows={4}
                className="w-full px-3 py-2 border rounded-md bg-white dark:bg-slate-800 dark:border-slate-700"
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <SubmitButton className="gap-2">
              <LucideSave className="w-4 h-4" />
              {isEditing ? 'Update Supplier' : 'Create Supplier'}
            </SubmitButton>

            <Link href="/suppliers">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </FormWithToast>
    </div>
  )
}

// Helper functions
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function isValidPhone(phone: string): boolean {
  // Simple phone validation - just check for digits
  const phoneRegex = /^[\d\s\-().+]+$/
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10
}
