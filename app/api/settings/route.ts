import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { withTenantContext } from '@/lib/db/tenant-context'
import { tenants, tenantMemberships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { mergeWithDefaults, type TenantSettings, type TenantSettingsUpdate } from '@/lib/types/tenant-settings'

// GET /api/settings - Get tenant settings
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    // Verify user is a member of this tenant
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get tenant settings
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        domain: true,
        settings: true,
        subscriptionStatus: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Merge with defaults to ensure all settings are present
    const settings = mergeWithDefaults(tenant.settings as Partial<TenantSettings>)

    // Filter settings based on user role
    const userRole = membership.role
    let filteredSettings = settings

    // Non-admins can't see certain sensitive settings
    if (!['owner', 'admin'].includes(userRole)) {
      filteredSettings = {
        ...settings,
        security: {
          ...settings.security,
          ipWhitelist: undefined,
          allowedDomains: undefined,
        },
        integrations: {
          googleWorkspace: { enabled: settings.integrations.googleWorkspace?.enabled || false },
          microsoftTeams: { enabled: settings.integrations.microsoftTeams?.enabled || false },
          slack: { enabled: settings.integrations.slack?.enabled || false },
          github: { enabled: settings.integrations.github?.enabled || false },
        },
      }
    }

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
        description: tenant.description,
        domain: tenant.domain,
        subscriptionStatus: tenant.subscriptionStatus,
      },
      settings: filteredSettings,
      userRole,
    })
  } catch (error) {
    console.error('Error fetching tenant settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Validation schema for settings update
const settingsUpdateSchema = z.object({
  general: z.object({
    displayName: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    timezone: z.string().optional(),
    locale: z.string().optional(),
    dateFormat: z.string().optional(),
    timeFormat: z.enum(['12h', '24h']).optional(),
  }).optional(),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    accentColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    logoUrl: z.string().url().optional().or(z.literal('')),
    faviconUrl: z.string().url().optional().or(z.literal('')),
    emailLogo: z.string().url().optional().or(z.literal('')),
    emailFooter: z.string().max(1000).optional(),
  }).optional(),
  features: z.object({
    enableInvitations: z.boolean().optional(),
    enableTeamChat: z.boolean().optional(),
    enableFileSharing: z.boolean().optional(),
    enableActivityFeed: z.boolean().optional(),
    enableApiAccess: z.boolean().optional(),
    enableWebhooks: z.boolean().optional(),
    enableSso: z.boolean().optional(),
    enable2fa: z.boolean().optional(),
    enableAuditLogs: z.boolean().optional(),
    enableCustomDomain: z.boolean().optional(),
  }).optional(),
  security: z.object({
    passwordPolicy: z.object({
      minLength: z.number().min(6).max(128).optional(),
      requireUppercase: z.boolean().optional(),
      requireLowercase: z.boolean().optional(),
      requireNumbers: z.boolean().optional(),
      requireSpecialChars: z.boolean().optional(),
      expirationDays: z.number().min(0).max(365).optional(),
    }).optional(),
    sessionTimeout: z.number().min(5).max(10080).optional(), // 5 min to 7 days
    ipWhitelist: z.array(z.string().ip()).optional(),
    allowedDomains: z.array(z.string()).optional(),
    enforceSSO: z.boolean().optional(),
    mfaRequired: z.boolean().optional(),
  }).optional(),
  notifications: z.object({
    emailEnabled: z.boolean().optional(),
    emailFromName: z.string().max(100).optional(),
    emailFromAddress: z.string().email().optional(),
    slackWebhook: z.string().url().optional().or(z.literal('')),
    webhookUrl: z.string().url().optional().or(z.literal('')),
    notifyOnNewMember: z.boolean().optional(),
    notifyOnMemberLeft: z.boolean().optional(),
    notifyOnRoleChange: z.boolean().optional(),
    dailyDigest: z.boolean().optional(),
  }).optional(),
  limits: z.object({
    maxMembers: z.number().min(1).max(10000).optional(),
    maxStorageGB: z.number().min(1).max(10000).optional(),
    maxApiCallsPerHour: z.number().min(100).max(1000000).optional(),
    maxFileUploadSizeMB: z.number().min(1).max(5000).optional(),
  }).optional(),
})

// PATCH /api/settings - Update tenant settings
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tenantId = request.headers.get('x-tenant-id')
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 400 })
    }

    const body = await request.json()
    const validatedData = settingsUpdateSchema.parse(body)

    // Verify user has permission to update settings (owner or admin)
    const membership = await db.query.tenantMemberships.findFirst({
      where: and(
        eq(tenantMemberships.tenantId, tenantId),
        eq(tenantMemberships.userId, session.user.id)
      ),
    })

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Get current settings
    const tenant = await db.query.tenants.findFirst({
      where: eq(tenants.id, tenantId),
      columns: {
        settings: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Merge current settings with updates
    const currentSettings = tenant.settings as Partial<TenantSettings> || {}
    const updatedSettings: TenantSettingsUpdate = {
      general: { ...currentSettings.general, ...validatedData.general },
      branding: { ...currentSettings.branding, ...validatedData.branding },
      features: { ...currentSettings.features, ...validatedData.features },
      security: { 
        ...currentSettings.security, 
        ...validatedData.security,
        passwordPolicy: {
          ...currentSettings.security?.passwordPolicy,
          ...validatedData.security?.passwordPolicy,
        },
      },
      notifications: { ...currentSettings.notifications, ...validatedData.notifications },
      limits: { ...currentSettings.limits, ...validatedData.limits },
    }

    // Update tenant settings
    const [updatedTenant] = await withTenantContext(tenantId, async (db) => {
      return await db.update(tenants)
        .set({
          settings: updatedSettings,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId))
        .returning({
          id: tenants.id,
          settings: tenants.settings,
        })
    })

    // Log the settings update
    console.log(`Settings updated for tenant ${tenantId} by user ${session.user.id}`)

    return NextResponse.json({ 
      message: 'Settings updated successfully',
      settings: mergeWithDefaults(updatedTenant.settings as Partial<TenantSettings>)
    })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation error',
        details: error.errors 
      }, { status: 400 })
    }

    console.error('Error updating tenant settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}