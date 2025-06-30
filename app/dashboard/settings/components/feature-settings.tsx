'use client'

import { useState } from 'react'
import type { TenantSettings } from '@/lib/types/tenant-settings'

interface FeatureSettingsProps {
  settings: TenantSettings['features']
  subscriptionStatus: string | null
  onSave: (updates: Partial<TenantSettings['features']>) => Promise<void>
  isSaving: boolean
}

interface FeatureConfig {
  key: keyof TenantSettings['features']
  label: string
  description: string
  requiredPlan: 'starter' | 'pro' | 'enterprise'
  icon: string
}

const features: FeatureConfig[] = [
  {
    key: 'enableInvitations',
    label: 'Team Invitations',
    description: 'Allow team members to invite new users',
    requiredPlan: 'starter',
    icon: '📧',
  },
  {
    key: 'enableActivityFeed',
    label: 'Activity Feed',
    description: 'Show recent team activities on the dashboard',
    requiredPlan: 'starter',
    icon: '📰',
  },
  {
    key: 'enableFileSharing',
    label: 'File Sharing',
    description: 'Enable file uploads and sharing within the team',
    requiredPlan: 'starter',
    icon: '📁',
  },
  {
    key: 'enable2fa',
    label: 'Two-Factor Authentication',
    description: 'Enable 2FA for enhanced security',
    requiredPlan: 'starter',
    icon: '🔐',
  },
  {
    key: 'enableTeamChat',
    label: 'Team Chat',
    description: 'Built-in messaging for team collaboration',
    requiredPlan: 'pro',
    icon: '💬',
  },
  {
    key: 'enableApiAccess',
    label: 'API Access',
    description: 'Enable programmatic access via REST API',
    requiredPlan: 'pro',
    icon: '🔌',
  },
  {
    key: 'enableWebhooks',
    label: 'Webhooks',
    description: 'Send real-time notifications to external services',
    requiredPlan: 'pro',
    icon: '🪝',
  },
  {
    key: 'enableSso',
    label: 'Single Sign-On (SSO)',
    description: 'Enterprise SSO with SAML/OIDC',
    requiredPlan: 'enterprise',
    icon: '🔑',
  },
  {
    key: 'enableAuditLogs',
    label: 'Audit Logs',
    description: 'Detailed activity logging for compliance',
    requiredPlan: 'enterprise',
    icon: '📋',
  },
  {
    key: 'enableCustomDomain',
    label: 'Custom Domain',
    description: 'Use your own domain for the application',
    requiredPlan: 'enterprise',
    icon: '🌐',
  },
]

export function FeatureSettings({ settings, subscriptionStatus, onSave, isSaving }: FeatureSettingsProps) {
  const [formData, setFormData] = useState({ ...settings })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await onSave(formData)
  }

  const handleToggle = (key: keyof TenantSettings['features']) => {
    setFormData({ ...formData, [key]: !formData[key] })
  }

  const isFeatureAvailable = (feature: FeatureConfig): boolean => {
    // During trial, only starter features are available
    if (subscriptionStatus === 'trialing') {
      return feature.requiredPlan === 'starter'
    }

    // For active subscriptions, check plan level
    // TODO: This would need to check actual subscription plan
    if (subscriptionStatus === 'active') {
      return true // Assuming all features for now
    }

    // Cancelled or past due - no features
    return false
  }

  const getPlanBadge = (plan: string) => {
    const colors = {
      starter: 'bg-green-100 text-green-800',
      pro: 'bg-blue-100 text-blue-800',
      enterprise: 'bg-purple-100 text-purple-800',
    }
    return colors[plan as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const groupedFeatures = {
    starter: features.filter(f => f.requiredPlan === 'starter'),
    pro: features.filter(f => f.requiredPlan === 'pro'),
    enterprise: features.filter(f => f.requiredPlan === 'enterprise'),
  }

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
          Feature Toggles
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {Object.entries(groupedFeatures).map(([planLevel, planFeatures]) => (
            <div key={planLevel}>
              <h4 className="text-sm font-medium text-gray-900 mb-3 capitalize">
                {planLevel} Features
              </h4>
              <div className="space-y-3">
                {planFeatures.map((feature) => {
                  const available = isFeatureAvailable(feature)
                  const enabled = formData[feature.key] ?? false

                  return (
                    <div
                      key={feature.key}
                      className={`relative flex items-start p-4 rounded-lg border ${
                        available 
                          ? 'border-gray-200 hover:border-gray-300' 
                          : 'border-gray-100 bg-gray-50 opacity-75'
                      }`}
                    >
                      <div className="flex items-center h-5">
                        <input
                          id={feature.key}
                          type="checkbox"
                          checked={enabled}
                          onChange={() => handleToggle(feature.key)}
                          disabled={!available || isSaving}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                        />
                      </div>
                      <div className="ml-3 flex-1">
                        <label
                          htmlFor={feature.key}
                          className={`text-sm font-medium ${
                            available ? 'text-gray-900' : 'text-gray-500'
                          }`}
                        >
                          <span className="mr-2">{feature.icon}</span>
                          {feature.label}
                        </label>
                        <p className="text-sm text-gray-500">
                          {feature.description}
                        </p>
                      </div>
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadge(feature.requiredPlan)}`}>
                          {feature.requiredPlan}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}

          {subscriptionStatus === 'trialing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm text-blue-800">
                <strong>Trial Limitations:</strong> Pro and Enterprise features are not available during the trial period.
                Upgrade your subscription to unlock these features.
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Features'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}