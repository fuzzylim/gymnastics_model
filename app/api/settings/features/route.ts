import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth/config'
import { db } from '@/lib/db'
import { tenants, tenantMemberships } from '@/lib/db/schema'
import { eq, and } from 'drizzle-orm'
import { mergeWithDefaults, isFeatureEnabled, type TenantSettings } from '@/lib/types/tenant-settings'

// GET /api/settings/features - Get feature availability
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

    // Get specific feature from query params
    const { searchParams } = new URL(request.url)
    const feature = searchParams.get('feature')

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
        settings: true,
        subscriptionStatus: true,
      },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    const settings = mergeWithDefaults(tenant.settings as Partial<TenantSettings>)

    // If specific feature requested
    if (feature && feature in settings.features) {
      const featureKey = feature as keyof TenantSettings['features']
      const enabled = isFeatureEnabled(settings, featureKey)
      
      // Check subscription-based restrictions
      const subscriptionRestrictions = getSubscriptionRestrictions(tenant.subscriptionStatus)
      const available = enabled && !subscriptionRestrictions.includes(featureKey)

      return NextResponse.json({
        feature,
        enabled,
        available,
        subscriptionStatus: tenant.subscriptionStatus,
        requiredPlan: getRequiredPlan(featureKey),
      })
    }

    // Return all features with availability
    const subscriptionRestrictions = getSubscriptionRestrictions(tenant.subscriptionStatus)
    const features = Object.entries(settings.features).reduce((acc, [key, enabled]) => {
      const featureKey = key as keyof TenantSettings['features']
      acc[featureKey] = {
        enabled,
        available: enabled && !subscriptionRestrictions.includes(featureKey),
        requiredPlan: getRequiredPlan(featureKey),
      }
      return acc
    }, {} as Record<string, any>)

    return NextResponse.json({
      features,
      subscriptionStatus: tenant.subscriptionStatus,
    })
  } catch (error) {
    console.error('Error fetching feature availability:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Helper to get subscription-based feature restrictions
function getSubscriptionRestrictions(subscriptionStatus: string | null): Array<keyof TenantSettings['features']> {
  switch (subscriptionStatus) {
    case 'trialing':
      return ['enableApiAccess', 'enableWebhooks', 'enableSso', 'enableAuditLogs', 'enableCustomDomain']
    case 'active':
      return [] // All features available
    case 'cancelled':
    case 'past_due':
      return [
        'enableInvitations',
        'enableTeamChat',
        'enableFileSharing',
        'enableApiAccess',
        'enableWebhooks',
        'enableSso',
        'enableAuditLogs',
        'enableCustomDomain'
      ]
    default:
      return []
  }
}

// Helper to get required plan for a feature
function getRequiredPlan(feature: keyof TenantSettings['features']): string {
  const enterpriseFeatures: Array<keyof TenantSettings['features']> = [
    'enableSso',
    'enableAuditLogs',
    'enableCustomDomain',
  ]

  const proFeatures: Array<keyof TenantSettings['features']> = [
    'enableApiAccess',
    'enableWebhooks',
    'enableTeamChat',
  ]

  if (enterpriseFeatures.includes(feature)) {
    return 'enterprise'
  } else if (proFeatures.includes(feature)) {
    return 'pro'
  } else {
    return 'starter'
  }
}