'use client'

import type { TenantSettings } from '@/lib/types/tenant-settings'

interface LimitsSettingsProps {
  settings: TenantSettings['limits']
  subscriptionStatus: string | null
  onSave: (updates: Partial<TenantSettings['limits']>) => Promise<void>
  isSaving: boolean
}

export function LimitsSettings({ settings, subscriptionStatus, onSave, isSaving }: LimitsSettingsProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Limits & Usage
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium text-gray-700">Current Limits</h4>
            <dl className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="bg-gray-50 px-4 py-3 rounded-lg">
                <dt className="text-xs font-medium text-gray-500">Max Members</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{settings?.maxMembers || 50}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-3 rounded-lg">
                <dt className="text-xs font-medium text-gray-500">Storage (GB)</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{settings?.maxStorageGB || 10}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-3 rounded-lg">
                <dt className="text-xs font-medium text-gray-500">API Calls/Hour</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{settings?.maxApiCallsPerHour || 1000}</dd>
              </div>
              <div className="bg-gray-50 px-4 py-3 rounded-lg">
                <dt className="text-xs font-medium text-gray-500">Max Upload (MB)</dt>
                <dd className="mt-1 text-2xl font-semibold text-gray-900">{settings?.maxFileUploadSizeMB || 100}</dd>
              </div>
            </dl>
          </div>
          <p className="text-sm text-gray-500">
            Contact sales to increase your limits.
          </p>
        </div>
      </div>
    </div>
  )
}