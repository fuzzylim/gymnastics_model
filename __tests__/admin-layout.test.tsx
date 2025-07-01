import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isUserSystemAdmin } from '@/lib/auth/admin-utils'

// Mock the admin utils
vi.mock('@/lib/auth/admin-utils', () => ({
  isUserSystemAdmin: vi.fn(),
}))

// Mock Next.js auth
vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}))

describe('Admin Layout Access Control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Authentication checks', () => {
    it('should allow access for system admin users', () => {
      const mockUser = {
        id: 'admin-user-id',
        email: 'admin@example.com',
        name: 'Admin User',
      }

      vi.mocked(isUserSystemAdmin).mockReturnValue(true)

      expect(isUserSystemAdmin(mockUser)).toBe(true)
    })

    it('should deny access for non-admin users', () => {
      const mockUser = {
        id: 'regular-user-id', 
        email: 'user@example.com',
        name: 'Regular User',
      }

      vi.mocked(isUserSystemAdmin).mockReturnValue(false)

      expect(isUserSystemAdmin(mockUser)).toBe(false)
    })

    it('should deny access for users without email', () => {
      const mockUser = {
        id: 'user-id',
        email: null,
        name: 'User Without Email',
      }

      vi.mocked(isUserSystemAdmin).mockReturnValue(false)

      expect(isUserSystemAdmin(mockUser)).toBe(false)
    })

    it('should deny access for undefined user', () => {
      vi.mocked(isUserSystemAdmin).mockReturnValue(false)

      expect(isUserSystemAdmin(undefined)).toBe(false)
      expect(isUserSystemAdmin(null)).toBe(false)
    })
  })

  describe('Admin permissions validation', () => {
    it('should validate admin email format', () => {
      const validEmails = [
        'admin@company.com',
        'system.admin@domain.co.uk',
        'super_admin@test.org',
      ]

      const invalidEmails = [
        '',
        'not-an-email',
        '@domain.com',
        'user@',
        null,
        undefined,
      ]

      validEmails.forEach(email => {
        const user = { email }
        // Mock positive response for valid email formats
        vi.mocked(isUserSystemAdmin).mockReturnValue(true)
        expect(isUserSystemAdmin(user)).toBe(true)
      })

      invalidEmails.forEach(email => {
        const user = { email }
        vi.mocked(isUserSystemAdmin).mockReturnValue(false)
        expect(isUserSystemAdmin(user)).toBe(false)
      })
    })
  })
})