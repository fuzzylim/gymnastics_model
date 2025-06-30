'use client'

import type { TenantSettings } from '@/lib/types/tenant-settings'

interface NotificationSettingsProps {
  settings: TenantSettings['notifications']
  onSave: (updates: Partial<TenantSettings['notifications']>) => Promise<void>
  isSaving: boolean
}

export function NotificationSettings({ settings, onSave, isSaving }: NotificationSettingsProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Notification Settings
        </h3>
        <p className="text-sm text-gray-500">
          Email and webhook notification configuration coming soon.
        </p>
      </div>
    </div>
  )
}