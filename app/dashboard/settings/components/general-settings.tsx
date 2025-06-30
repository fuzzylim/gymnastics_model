'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TenantSettings } from '@/lib/types/tenant-settings'

interface GeneralSettingsProps {
  tenant: {
    id: string
    name: string
    slug: string
    description: string | null
    domain: string | null
  }
  settings: TenantSettings['general']
  userRole: string
  onSave: (updates: Partial<TenantSettings['general']>) => Promise<void>
  isSaving: boolean
}

const timezones = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

const locales = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'es-ES', label: 'Spanish' },
  { value: 'ja-JP', label: 'Japanese' },
]

export function GeneralSettings({ tenant, settings, userRole, onSave, isSaving }: GeneralSettingsProps) {
  const [formData, setFormData] = useState({
    displayName: settings.displayName || tenant.name,
    description: settings.description || tenant.description || '',
    timezone: settings.timezone || 'UTC',
    locale: settings.locale || 'en-AU',
    dateFormat: settings.dateFormat || 'DD/MM/YYYY',
    timeFormat: settings.timeFormat || '12h',
  })

  const [profileData, setProfileData] = useState({
    name: tenant.name,
    description: tenant.description || '',
    slug: tenant.slug,
    domain: tenant.domain || '',
  })

  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [profileMessage, setProfileMessage] = useState('')
  const router = useRouter()

  const handleGeneralSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingProfile(true)
    setProfileMessage('')

    try {
      const response = await fetch('/api/settings/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
        },
        body: JSON.stringify(profileData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile')
      }

      setProfileMessage('Profile updated successfully')
      setTimeout(() => setProfileMessage(''), 3000)
      router.refresh()
    } catch (error) {
      setProfileMessage(error instanceof Error ? error.message : 'Failed to update profile')
      setTimeout(() => setProfileMessage(''), 5000)
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Tenant Profile (Owner only) */}
      {userRole === 'owner' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
              Tenant Profile
            </h3>
            
            {profileMessage && (
              <div className={`mb-4 p-3 rounded-md text-sm ${
                profileMessage.includes('success')
                  ? 'bg-green-50 text-green-800'
                  : 'bg-red-50 text-red-800'
              }`}>
                {profileMessage}
              </div>
            )}

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Tenant Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  id="description"
                  rows={3}
                  value={profileData.description}
                  onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Brief description of your organisation"
                />
              </div>

              <div>
                <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
                  URL Slug
                </label>
                <div className="mt-1 flex rounded-md shadow-sm">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm">
                    app.example.com/
                  </span>
                  <input
                    type="text"
                    id="slug"
                    value={profileData.slug}
                    onChange={(e) => setProfileData({ ...profileData, slug: e.target.value })}
                    className="flex-1 min-w-0 block w-full px-3 py-2 rounded-none rounded-r-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    pattern="^[a-z0-9-]+$"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Lowercase letters, numbers, and hyphens only
                </p>
              </div>

              <div>
                <label htmlFor="domain" className="block text-sm font-medium text-gray-700">
                  Custom Domain
                </label>
                <input
                  type="text"
                  id="domain"
                  value={profileData.domain}
                  onChange={(e) => setProfileData({ ...profileData, domain: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="yourdomain.com"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Configure DNS to point to our servers
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {isSavingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
            General Preferences
          </h3>

          <form onSubmit={handleGeneralSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
                  Timezone
                </label>
                <select
                  id="timezone"
                  value={formData.timezone}
                  onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {timezones.map((tz) => (
                    <option key={tz.value} value={tz.value}>
                      {tz.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="locale" className="block text-sm font-medium text-gray-700">
                  Language
                </label>
                <select
                  id="locale"
                  value={formData.locale}
                  onChange={(e) => setFormData({ ...formData, locale: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  {locales.map((locale) => (
                    <option key={locale.value} value={locale.value}>
                      {locale.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="dateFormat" className="block text-sm font-medium text-gray-700">
                  Date Format
                </label>
                <select
                  id="dateFormat"
                  value={formData.dateFormat}
                  onChange={(e) => setFormData({ ...formData, dateFormat: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label htmlFor="timeFormat" className="block text-sm font-medium text-gray-700">
                  Time Format
                </label>
                <select
                  id="timeFormat"
                  value={formData.timeFormat}
                  onChange={(e) => setFormData({ ...formData, timeFormat: e.target.value as '12h' | '24h' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="12h">12-hour</option>
                  <option value="24h">24-hour</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}