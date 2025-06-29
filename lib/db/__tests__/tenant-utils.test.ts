import { describe, it, expect, vi } from 'vitest'
import * as tenantUtils from '../tenant-utils'
import { db } from '../index'

// Mock the database
vi.mock('../index', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    transaction: vi.fn(),
  }
}))

describe('Tenant Utilities', () => {
  describe('getTenantBySlug', () => {
    it('should return tenant when found', async () => {
      const mockTenant = {
        id: 'tenant-123',
        slug: 'acme-corp',
        name: 'Acme Corporation',
      }

      // Mock the chain
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockTenant]),
      }
      
      vi.mocked(db.select).mockReturnValue(mockChain as any)

      const result = await tenantUtils.getTenantBySlug('acme-corp')
      
      expect(result).toEqual(mockTenant)
      expect(mockChain.limit).toHaveBeenCalledWith(1)
    })

    it('should return null when tenant not found', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }
      
      vi.mocked(db.select).mockReturnValue(mockChain as any)

      const result = await tenantUtils.getTenantBySlug('non-existent')
      
      expect(result).toBeNull()
    })
  })

  describe('userHasTenantAccess', () => {
    it('should return true when user has access', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ id: 'membership-123' }]),
      }
      
      vi.mocked(db.select).mockReturnValue(mockChain as any)

      const result = await tenantUtils.userHasTenantAccess('user-123', 'tenant-123')
      
      expect(result).toBe(true)
    })

    it('should return false when user has no access', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }
      
      vi.mocked(db.select).mockReturnValue(mockChain as any)

      const result = await tenantUtils.userHasTenantAccess('user-123', 'tenant-456')
      
      expect(result).toBe(false)
    })
  })

  describe('getUserTenantRole', () => {
    it('should return role when user has membership', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([{ role: 'admin' }]),
      }
      
      vi.mocked(db.select).mockReturnValue(mockChain as any)

      const result = await tenantUtils.getUserTenantRole('user-123', 'tenant-123')
      
      expect(result).toBe('admin')
    })

    it('should return null when user has no membership', async () => {
      const mockChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      }
      
      vi.mocked(db.select).mockReturnValue(mockChain as any)

      const result = await tenantUtils.getUserTenantRole('user-123', 'tenant-456')
      
      expect(result).toBeNull()
    })
  })
})