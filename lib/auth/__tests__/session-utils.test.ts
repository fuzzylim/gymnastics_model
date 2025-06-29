import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCurrentTenantId, getCurrentTenantSlug, getCurrentUserId } from '../session-utils'

const mockHeaders = {
  get: vi.fn(),
}

// Mock Next.js headers
vi.mock('next/headers', () => ({
  headers: () => mockHeaders,
}))

// Mock auth config
vi.mock('../config', () => ({
  auth: vi.fn(),
}))

// Mock tenant utils
vi.mock('@/lib/db/tenant-utils', () => ({
  userHasTenantAccess: vi.fn(),
  getUserTenantRole: vi.fn(),
}))

describe('Session Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getCurrentTenantId', () => {
    it('should return tenant ID from headers', async () => {
      const tenantId = 'tenant-123'
      mockHeaders.get.mockReturnValue(tenantId)

      const result = await getCurrentTenantId()

      expect(mockHeaders.get).toHaveBeenCalledWith('x-tenant-id')
      expect(result).toBe(tenantId)
    })

    it('should return null if no tenant ID in headers', async () => {
      mockHeaders.get.mockReturnValue(null)

      const result = await getCurrentTenantId()

      expect(result).toBeNull()
    })
  })

  describe('getCurrentTenantSlug', () => {
    it('should return tenant slug from headers', async () => {
      const tenantSlug = 'tenant-slug'
      mockHeaders.get.mockReturnValue(tenantSlug)

      const result = await getCurrentTenantSlug()

      expect(mockHeaders.get).toHaveBeenCalledWith('x-tenant-slug')
      expect(result).toBe(tenantSlug)
    })
  })

  describe('getCurrentUserId', () => {
    it('should return user ID from headers', async () => {
      const userId = 'user-123'
      mockHeaders.get.mockReturnValue(userId)

      const result = await getCurrentUserId()

      expect(mockHeaders.get).toHaveBeenCalledWith('x-user-id')
      expect(result).toBe(userId)
    })
  })
})