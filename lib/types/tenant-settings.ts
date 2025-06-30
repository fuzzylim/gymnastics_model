/**
 * Tenant settings type definitions
 */

export interface TenantSettings {
  // General settings
  general: {
    displayName?: string
    description?: string
    logo?: string
    favicon?: string
    timezone?: string
    locale?: string
    dateFormat?: string
    timeFormat?: '12h' | '24h'
  }

  // Branding settings
  branding: {
    primaryColor?: string
    secondaryColor?: string
    accentColor?: string
    logoUrl?: string
    faviconUrl?: string
    customCss?: string
    emailLogo?: string
    emailFooter?: string
  }

  // Feature toggles
  features: {
    enableInvitations?: boolean
    enableTeamChat?: boolean
    enableFileSharing?: boolean
    enableActivityFeed?: boolean
    enableApiAccess?: boolean
    enableWebhooks?: boolean
    enableSso?: boolean
    enable2fa?: boolean
    enableAuditLogs?: boolean
    enableCustomDomain?: boolean
  }

  // Security settings
  security: {
    passwordPolicy?: {
      minLength?: number
      requireUppercase?: boolean
      requireLowercase?: boolean
      requireNumbers?: boolean
      requireSpecialChars?: boolean
      expirationDays?: number
    }
    sessionTimeout?: number // in minutes
    ipWhitelist?: string[]
    allowedDomains?: string[] // for email domains
    enforceSSO?: boolean
    mfaRequired?: boolean
  }

  // Notification settings
  notifications: {
    emailEnabled?: boolean
    emailFromName?: string
    emailFromAddress?: string
    slackWebhook?: string
    webhookUrl?: string
    notifyOnNewMember?: boolean
    notifyOnMemberLeft?: boolean
    notifyOnRoleChange?: boolean
    dailyDigest?: boolean
  }

  // Limits and quotas
  limits: {
    maxMembers?: number
    maxStorageGB?: number
    maxApiCallsPerHour?: number
    maxFileUploadSizeMB?: number
  }

  // Integration settings
  integrations: {
    googleWorkspace?: {
      enabled: boolean
      domain?: string
      clientId?: string
    }
    microsoftTeams?: {
      enabled: boolean
      tenantId?: string
    }
    slack?: {
      enabled: boolean
      workspaceId?: string
    }
    github?: {
      enabled: boolean
      organization?: string
    }
  }

  // Custom fields (for extensibility)
  custom?: Record<string, any>
}

// Default settings for new tenants
export const DEFAULT_TENANT_SETTINGS: TenantSettings = {
  general: {
    timezone: 'UTC',
    locale: 'en-AU',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
  },
  branding: {
    primaryColor: '#3b82f6', // blue-500
    secondaryColor: '#1e40af', // blue-800
    accentColor: '#f59e0b', // amber-500
  },
  features: {
    enableInvitations: true,
    enableTeamChat: false,
    enableFileSharing: true,
    enableActivityFeed: true,
    enableApiAccess: false,
    enableWebhooks: false,
    enableSso: false,
    enable2fa: true,
    enableAuditLogs: false,
    enableCustomDomain: false,
  },
  security: {
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
    },
    sessionTimeout: 1440, // 24 hours
    ipWhitelist: [],
    allowedDomains: [],
    enforceSSO: false,
    mfaRequired: false,
  },
  notifications: {
    emailEnabled: true,
    notifyOnNewMember: true,
    notifyOnMemberLeft: true,
    notifyOnRoleChange: true,
    dailyDigest: false,
  },
  limits: {
    maxMembers: 50,
    maxStorageGB: 10,
    maxApiCallsPerHour: 1000,
    maxFileUploadSizeMB: 100,
  },
  integrations: {
    googleWorkspace: { enabled: false },
    microsoftTeams: { enabled: false },
    slack: { enabled: false },
    github: { enabled: false },
  },
  custom: {},
}

// Settings update schema for validation
export interface TenantSettingsUpdate {
  general?: Partial<TenantSettings['general']>
  branding?: Partial<TenantSettings['branding']>
  features?: Partial<TenantSettings['features']>
  security?: Partial<TenantSettings['security']>
  notifications?: Partial<TenantSettings['notifications']>
  limits?: Partial<TenantSettings['limits']>
  integrations?: Partial<TenantSettings['integrations']>
  custom?: Record<string, any>
}

// Settings categories for UI organisation
export const SETTINGS_CATEGORIES = [
  {
    id: 'general',
    name: 'General',
    description: 'Basic tenant information and preferences',
    icon: '⚙️',
  },
  {
    id: 'branding',
    name: 'Branding',
    description: 'Customise your tenant appearance',
    icon: '🎨',
  },
  {
    id: 'features',
    name: 'Features',
    description: 'Enable or disable platform features',
    icon: '🚀',
  },
  {
    id: 'security',
    name: 'Security',
    description: 'Security policies and access control',
    icon: '🔒',
  },
  {
    id: 'notifications',
    name: 'Notifications',
    description: 'Email and webhook notifications',
    icon: '🔔',
  },
  {
    id: 'limits',
    name: 'Limits & Usage',
    description: 'Resource limits and quotas',
    icon: '📊',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Third-party service connections',
    icon: '🔌',
  },
] as const

// Helper to merge settings with defaults
export function mergeWithDefaults(settings: Partial<TenantSettings> = {}): TenantSettings {
  return {
    general: { ...DEFAULT_TENANT_SETTINGS.general, ...settings.general },
    branding: { ...DEFAULT_TENANT_SETTINGS.branding, ...settings.branding },
    features: { ...DEFAULT_TENANT_SETTINGS.features, ...settings.features },
    security: { 
      ...DEFAULT_TENANT_SETTINGS.security, 
      ...settings.security,
      passwordPolicy: {
        ...DEFAULT_TENANT_SETTINGS.security.passwordPolicy,
        ...settings.security?.passwordPolicy,
      },
    },
    notifications: { ...DEFAULT_TENANT_SETTINGS.notifications, ...settings.notifications },
    limits: { ...DEFAULT_TENANT_SETTINGS.limits, ...settings.limits },
    integrations: { 
      ...DEFAULT_TENANT_SETTINGS.integrations, 
      ...settings.integrations,
      googleWorkspace: {
        enabled: settings.integrations?.googleWorkspace?.enabled ?? false,
        domain: settings.integrations?.googleWorkspace?.domain,
        clientId: settings.integrations?.googleWorkspace?.clientId,
      },
      microsoftTeams: {
        enabled: settings.integrations?.microsoftTeams?.enabled ?? false,
        tenantId: settings.integrations?.microsoftTeams?.tenantId,
      },
      slack: {
        enabled: settings.integrations?.slack?.enabled ?? false,
        workspaceId: settings.integrations?.slack?.workspaceId,
      },
      github: {
        enabled: settings.integrations?.github?.enabled ?? false,
        organization: settings.integrations?.github?.organization,
      },
    },
    custom: { ...settings.custom },
  }
}

// Type guards
export function isValidSettingsCategory(category: string): category is keyof TenantSettings {
  return ['general', 'branding', 'features', 'security', 'notifications', 'limits', 'integrations', 'custom'].includes(category)
}

// Feature flag helpers
export function isFeatureEnabled(settings: TenantSettings, feature: keyof TenantSettings['features']): boolean {
  return settings.features[feature] ?? DEFAULT_TENANT_SETTINGS.features[feature] ?? false
}

// Security check helpers
export function checkPasswordPolicy(password: string, policy: TenantSettings['security']['passwordPolicy']): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const p = policy || DEFAULT_TENANT_SETTINGS.security.passwordPolicy

  if (p?.minLength && password.length < p.minLength) {
    errors.push(`Password must be at least ${p.minLength} characters long`)
  }
  if (p?.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  if (p?.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  if (p?.requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  if (p?.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return { valid: errors.length === 0, errors }
}