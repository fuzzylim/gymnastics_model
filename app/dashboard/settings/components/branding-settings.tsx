'use client'

import { useState } from 'react'
import type { TenantSettings } from '@/lib/types/tenant-settings'

interface BrandingSettingsProps {
  settings: TenantSettings['branding']
  onSave: (updates: Partial<TenantSettings['branding']>) => Promise<void>
  isSaving: boolean
}

export function BrandingSettings({ settings, onSave, isSaving }: BrandingSettingsProps) {
  const [formData, setFormData] = useState({ ...settings })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Branding & Customisation
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div>
              <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700">
                Primary Colour
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="color"
                  id="primaryColor"
                  value={formData.primaryColor || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="h-10 w-20 rounded border-gray-300"
                />
                <input
                  type="text"
                  value={formData.primaryColor || '#3b82f6'}
                  onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                  className="ml-2 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#3b82f6"
                />
              </div>
            </div>

            <div>
              <label htmlFor="secondaryColor" className="block text-sm font-medium text-gray-700">
                Secondary Colour
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="color"
                  id="secondaryColor"
                  value={formData.secondaryColor || '#1e40af'}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="h-10 w-20 rounded border-gray-300"
                />
                <input
                  type="text"
                  value={formData.secondaryColor || '#1e40af'}
                  onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                  className="ml-2 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#1e40af"
                />
              </div>
            </div>

            <div>
              <label htmlFor="accentColor" className="block text-sm font-medium text-gray-700">
                Accent Colour
              </label>
              <div className="mt-1 flex items-center">
                <input
                  type="color"
                  id="accentColor"
                  value={formData.accentColor || '#f59e0b'}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="h-10 w-20 rounded border-gray-300"
                />
                <input
                  type="text"
                  value={formData.accentColor || '#f59e0b'}
                  onChange={(e) => setFormData({ ...formData, accentColor: e.target.value })}
                  className="ml-2 flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#f59e0b"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="logoUrl" className="block text-sm font-medium text-gray-700">
                Logo URL
              </label>
              <input
                type="url"
                id="logoUrl"
                value={formData.logoUrl || ''}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://example.com/logo.png"
              />
              <p className="mt-1 text-xs text-gray-500">
                Recommended size: 200x50px, PNG or SVG format
              </p>
            </div>

            <div>
              <label htmlFor="faviconUrl" className="block text-sm font-medium text-gray-700">
                Favicon URL
              </label>
              <input
                type="url"
                id="faviconUrl"
                value={formData.faviconUrl || ''}
                onChange={(e) => setFormData({ ...formData, faviconUrl: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://example.com/favicon.ico"
              />
              <p className="mt-1 text-xs text-gray-500">
                Recommended size: 32x32px, ICO or PNG format
              </p>
            </div>

            <div>
              <label htmlFor="emailLogo" className="block text-sm font-medium text-gray-700">
                Email Logo URL
              </label>
              <input
                type="url"
                id="emailLogo"
                value={formData.emailLogo || ''}
                onChange={(e) => setFormData({ ...formData, emailLogo: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="https://example.com/email-logo.png"
              />
              <p className="mt-1 text-xs text-gray-500">
                Logo to use in email templates
              </p>
            </div>

            <div>
              <label htmlFor="emailFooter" className="block text-sm font-medium text-gray-700">
                Email Footer Text
              </label>
              <textarea
                id="emailFooter"
                rows={3}
                value={formData.emailFooter || ''}
                onChange={(e) => setFormData({ ...formData, emailFooter: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="© 2024 Your Company. All rights reserved."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Branding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}