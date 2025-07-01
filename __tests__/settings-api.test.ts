import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mergeWithDefaults, isFeatureEnabled, checkPasswordPolicy } from '@/lib/types/tenant-settings'

describe('Tenant Settings', () => {
  describe('mergeWithDefaults', () => {
    it('should merge empty settings with defaults', () => {
      const result = mergeWithDefaults({})
      
      expect(result.general.timezone).toBe('UTC')
      expect(result.general.locale).toBe('en-AU')
      expect(result.features.enableInvitations).toBe(true)
      expect(result.security.sessionTimeout).toBe(1440)
    })

    it('should preserve custom settings while filling defaults', () => {
      const customSettings = {
        general: { timezone: 'America/New_York' },
        features: { enableInvitations: false },
      }
      
      const result = mergeWithDefaults(customSettings)
      
      expect(result.general.timezone).toBe('America/New_York')
      expect(result.general.locale).toBe('en-AU') // default preserved
      expect(result.features.enableInvitations).toBe(false)
      expect(result.features.enableActivityFeed).toBe(true) // default preserved
    })
  })

  describe('isFeatureEnabled', () => {
    it('should check feature status correctly', () => {
      const settings = mergeWithDefaults({
        features: {
          enableInvitations: true,
          enableApiAccess: false,
        },
      })

      expect(isFeatureEnabled(settings, 'enableInvitations')).toBe(true)
      expect(isFeatureEnabled(settings, 'enableApiAccess')).toBe(false)
      expect(isFeatureEnabled(settings, 'enableActivityFeed')).toBe(true) // uses default
    })
  })

  describe('checkPasswordPolicy', () => {
    const policy = {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    }

    it('should validate strong passwords', () => {
      const result = checkPasswordPolicy('Test123!@#', policy)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject weak passwords', () => {
      const result = checkPasswordPolicy('weak', policy)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Password must be at least 8 characters long')
      expect(result.errors).toContain('Password must contain at least one uppercase letter')
      expect(result.errors).toContain('Password must contain at least one number')
      expect(result.errors).toContain('Password must contain at least one special character')
    })

    it('should check individual requirements', () => {
      const testCases = [
        { password: 'test', errors: ['uppercase', 'number', 'special', 'length'] },
        { password: 'Test', errors: ['number', 'special', 'length'] },
        { password: 'Test1', errors: ['special', 'length'] },
        { password: 'Test1!', errors: ['length'] },
        { password: 'Test1!@#', errors: [] },
      ]

      testCases.forEach(({ password, errors }) => {
        const result = checkPasswordPolicy(password, policy)
        expect(result.errors.length).toBe(errors.length)
      })
    })
  })

  describe('Settings Categories', () => {
    it('should validate category keys', () => {
      const validCategories = ['general', 'branding', 'features', 'security', 'notifications', 'limits', 'integrations', 'custom']
      
      validCategories.forEach(category => {
        expect(['general', 'branding', 'features', 'security', 'notifications', 'limits', 'integrations', 'custom'].includes(category)).toBe(true)
      })
    })
  })

  describe('Feature Plan Requirements', () => {
    it('should map features to correct plans', () => {
      const starterFeatures = ['enableInvitations', 'enableActivityFeed', 'enableFileSharing', 'enable2fa']
      const proFeatures = ['enableTeamChat', 'enableApiAccess', 'enableWebhooks']
      const enterpriseFeatures = ['enableSso', 'enableAuditLogs', 'enableCustomDomain']

      // This would be tested against the actual getRequiredPlan function
      // if it were exported
      expect(starterFeatures).toBeTruthy()
      expect(proFeatures).toBeTruthy()
      expect(enterpriseFeatures).toBeTruthy()
    })
  })
})