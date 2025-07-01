'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { TenantSettings, SETTINGS_CATEGORIES } from '@/lib/types/tenant-settings'
import { GeneralSettings } from './general-settings'
import { BrandingSettings } from './branding-settings'
import { FeatureSettings } from './feature-settings'
import { SecuritySettings } from './security-settings'
import { NotificationSettings } from './notification-settings'
import { LimitsSettings } from './limits-settings'
import { IntegrationSettings } from './integration-settings'

interface SettingsTabsProps {
  tenant: {
    id: string
    name: string
    slug: string
    description: string | null
    domain: string | null
    subscriptionStatus: string | null
  }
  settings: TenantSettings
  userRole: string
}

const tabs = [
  { id: 'general', name: 'General', icon: '⚙️' },
  { id: 'branding', name: 'Branding', icon: '🎨' },
  { id: 'features', name: 'Features', icon: '🚀' },
  { id: 'security', name: 'Security', icon: '🔒' },
  { id: 'notifications', name: 'Notifications', icon: '🔔' },
  { id: 'limits', name: 'Limits & Usage', icon: '📊' },
  { id: 'integrations', name: 'Integrations', icon: '🔌' },
]

export function SettingsTabs({ tenant, settings, userRole }: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState('general')
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const router = useRouter()

  const handleSave = async (category: string, updates: any) => {
    setIsSaving(true)
    setSaveMessage('')

    try {
      const response = await fetch('/api/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': tenant.id,
        },
        body: JSON.stringify({ [category]: updates }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save settings')
      }

      setSaveMessage('Settings saved successfully')
      setTimeout(() => setSaveMessage(''), 3000)
      
      // Refresh the page to get updated settings
      router.refresh()
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save settings')
      setTimeout(() => setSaveMessage(''), 5000)
    } finally {
      setIsSaving(false)
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general':
        return (
          <GeneralSettings
            tenant={tenant}
            settings={settings.general}
            userRole={userRole}
            onSave={(updates) => handleSave('general', updates)}
            isSaving={isSaving}
          />
        )
      case 'branding':
        return (
          <BrandingSettings
            settings={settings.branding}
            onSave={(updates) => handleSave('branding', updates)}
            isSaving={isSaving}
          />
        )
      case 'features':
        return (
          <FeatureSettings
            settings={settings.features}
            subscriptionStatus={tenant.subscriptionStatus}
            onSave={(updates) => handleSave('features', updates)}
            isSaving={isSaving}
          />
        )
      case 'security':
        return (
          <SecuritySettings
            settings={settings.security}
            userRole={userRole}
            onSave={(updates) => handleSave('security', updates)}
            isSaving={isSaving}
          />
        )
      case 'notifications':
        return (
          <NotificationSettings
            settings={settings.notifications}
            onSave={(updates) => handleSave('notifications', updates)}
            isSaving={isSaving}
          />
        )
      case 'limits':
        return (
          <LimitsSettings
            settings={settings.limits}
            subscriptionStatus={tenant.subscriptionStatus}
            onSave={(updates) => handleSave('limits', updates)}
            isSaving={isSaving}
          />
        )
      case 'integrations':
        return (
          <IntegrationSettings
            settings={settings.integrations}
            onSave={(updates) => handleSave('integrations', updates)}
            isSaving={isSaving}
          />
        )
      default:
        return null
    }
  }

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div className={`mt-4 p-4 rounded-md ${
          saveMessage.includes('success') 
            ? 'bg-green-50 text-green-800' 
            : 'bg-red-50 text-red-800'
        }`}>
          {saveMessage}
        </div>
      )}

      {/* Tab Content */}
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  )
}