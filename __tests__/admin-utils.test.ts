import { describe, it, expect, beforeEach } from 'vitest'
import { isSystemAdmin, isUserSystemAdmin, getSystemAdminEmails, addSystemAdmin } from '@/lib/auth/admin-utils'

describe('Admin Utils', () => {
  describe('isSystemAdmin', () => {
    it('should return false for non-admin emails', () => {
      expect(isSystemAdmin('user@example.com')).toBe(false)
      expect(isSystemAdmin('test@test.com')).toBe(false)
      expect(isSystemAdmin('')).toBe(false)
    })

    it('should handle case insensitive emails', () => {
      // Add a test admin
      addSystemAdmin('ADMIN@EXAMPLE.COM')
      
      expect(isSystemAdmin('admin@example.com')).toBe(true)
      expect(isSystemAdmin('ADMIN@EXAMPLE.COM')).toBe(true)
      expect(isSystemAdmin('Admin@Example.Com')).toBe(true)
    })

    it('should return true for system admin emails from environment', () => {
      // Test environment variable admin (if set)
      if (process.env.SYSTEM_ADMIN_EMAIL) {
        expect(isSystemAdmin(process.env.SYSTEM_ADMIN_EMAIL)).toBe(true)
      }
    })
  })

  describe('isUserSystemAdmin', () => {
    beforeEach(() => {
      // Clean up any test admins
      const currentAdmins = getSystemAdminEmails()
      currentAdmins.forEach(email => {
        if (email.includes('test')) {
          // Remove test emails (in a real implementation, we'd have a remove function)
        }
      })
    })

    it('should return false for null or undefined user', () => {
      expect(isUserSystemAdmin(null)).toBe(false)
      expect(isUserSystemAdmin(undefined)).toBe(false)
    })

    it('should return false for user without email', () => {
      expect(isUserSystemAdmin({})).toBe(false)
      expect(isUserSystemAdmin({ email: null })).toBe(false)
      expect(isUserSystemAdmin({ email: '' })).toBe(false)
    })

    it('should return false for non-admin user', () => {
      const user = { email: 'user@example.com' }
      expect(isUserSystemAdmin(user)).toBe(false)
    })

    it('should return true for admin user', () => {
      const adminEmail = 'test-admin@example.com'
      addSystemAdmin(adminEmail)
      
      const user = { email: adminEmail }
      expect(isUserSystemAdmin(user)).toBe(true)
    })
  })

  describe('addSystemAdmin', () => {
    it('should add new admin email', () => {
      const testEmail = 'new-admin@test.com'
      const initialCount = getSystemAdminEmails().length
      
      addSystemAdmin(testEmail)
      
      expect(getSystemAdminEmails()).toContain(testEmail.toLowerCase())
      expect(getSystemAdminEmails().length).toBe(initialCount + 1)
    })

    it('should not add duplicate admin emails', () => {
      const testEmail = 'duplicate-admin@test.com'
      const initialCount = getSystemAdminEmails().length
      
      addSystemAdmin(testEmail)
      addSystemAdmin(testEmail) // Try to add again
      
      expect(getSystemAdminEmails().length).toBe(initialCount + 1)
    })

    it('should normalize email to lowercase', () => {
      const testEmail = 'UPPERCASE-ADMIN@TEST.COM'
      addSystemAdmin(testEmail)
      
      expect(getSystemAdminEmails()).toContain(testEmail.toLowerCase())
      expect(isSystemAdmin(testEmail.toLowerCase())).toBe(true)
    })
  })

  describe('getSystemAdminEmails', () => {
    it('should return array of admin emails', () => {
      const emails = getSystemAdminEmails()
      expect(Array.isArray(emails)).toBe(true)
    })

    it('should include environment admin email if set', () => {
      if (process.env.SYSTEM_ADMIN_EMAIL) {
        const emails = getSystemAdminEmails()
        expect(emails).toContain(process.env.SYSTEM_ADMIN_EMAIL)
      }
    })
  })
})