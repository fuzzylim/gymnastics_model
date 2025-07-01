'use client'

import type { TenantSettings } from '@/lib/types/tenant-settings'

interface IntegrationSettingsProps {
  settings: TenantSettings['integrations']
  onSave: (updates: Partial<TenantSettings['integrations']>) => Promise<void>
  isSaving: boolean
}

export function IntegrationSettings({ settings, onSave, isSaving }: IntegrationSettingsProps) {
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Integrations
        </h3>
        <div className="space-y-4">
          {Object.entries({
            googleWorkspace: { name: 'Google Workspace', icon: '🔷' },
            microsoftTeams: { name: 'Microsoft Teams', icon: '🟦' },
            slack: { name: 'Slack', icon: '💬' },
            github: { name: 'GitHub', icon: '🐙' },
          }).map(([key, config]) => (
            <div key={key} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center">
                <span className="text-2xl mr-3">{config.icon}</span>
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{config.name}</h4>
                  <p className="text-sm text-gray-500">
                    {settings?.[key as keyof typeof settings]?.enabled ? 'Connected' : 'Not connected'}
                  </p>
                </div>
              </div>
              <button className="text-sm text-blue-600 hover:text-blue-500">
                Configure
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}