'use client'

import { useState } from 'react'
import type { TenantSettings } from '@/lib/types/tenant-settings'

interface SecuritySettingsProps {
  settings: TenantSettings['security']
  userRole: string
  onSave: (updates: Partial<TenantSettings['security']>) => Promise<void>
  isSaving: boolean
}

export function SecuritySettings({ settings, userRole, onSave, isSaving }: SecuritySettingsProps) {
  const [formData, setFormData] = useState({ ...settings })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  // Only owners can modify security settings
  const canEdit = userRole === 'owner'

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Security Settings
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-900">Password Policy</h4>
            <p className="text-sm text-gray-500">
              Configure password requirements for all users
            </p>
            
            <div className="space-y-3">
              <div>
                <label htmlFor="minLength" className="block text-sm font-medium text-gray-700">
                  Minimum Length
                </label>
                <input
                  type="number"
                  id="minLength"
                  min="6"
                  max="128"
                  disabled={!canEdit}
                  value={formData.passwordPolicy?.minLength || 8}
                  onChange={(e) => setFormData({
                    ...formData,
                    passwordPolicy: {
                      ...formData.passwordPolicy,
                      minLength: parseInt(e.target.value),
                    },
                  })}
                  className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
                />
              </div>

              <div className="space-y-2">
                {[
                  { key: 'requireUppercase', label: 'Require uppercase letters' },
                  { key: 'requireLowercase', label: 'Require lowercase letters' },
                  { key: 'requireNumbers', label: 'Require numbers' },
                  { key: 'requireSpecialChars', label: 'Require special characters' },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      disabled={!canEdit}
                      checked={formData.passwordPolicy?.[key as keyof typeof formData.passwordPolicy] as boolean || false}
                      onChange={(e) => setFormData({
                        ...formData,
                        passwordPolicy: {
                          ...formData.passwordPolicy,
                          [key]: e.target.checked,
                        },
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700">
              Session Timeout (minutes)
            </label>
            <input
              type="number"
              id="sessionTimeout"
              min="5"
              max="10080"
              disabled={!canEdit}
              value={formData.sessionTimeout || 1440}
              onChange={(e) => setFormData({
                ...formData,
                sessionTimeout: parseInt(e.target.value),
              })}
              className="mt-1 block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-gray-500">
              Users will be logged out after this period of inactivity
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={formData.mfaRequired || false}
                onChange={(e) => setFormData({
                  ...formData,
                  mfaRequired: e.target.checked,
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Require two-factor authentication for all users
              </span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                disabled={!canEdit}
                checked={formData.enforceSSO || false}
                onChange={(e) => setFormData({
                  ...formData,
                  enforceSSO: e.target.checked,
                })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
              />
              <span className="ml-2 text-sm text-gray-700">
                Enforce SSO authentication (disable password login)
              </span>
            </label>
          </div>

          {!canEdit && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <p className="text-sm text-yellow-800">
                Only tenant owners can modify security settings.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !canEdit}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Security Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}