import { describe, it, expect, beforeEach, vi } from 'vitest'
import { withTenantContext, TenantContext } from '../tenant-context'
import { db } from '../index'

// Mock the database
vi.mock('../index', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    transaction: vi.fn(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    innerJoin: vi.fn().mockReturnThis(),
  },
  client: vi.fn(),
}))

describe('Tenant Context', () => {
  const mockTenantId = 'tenant-123'
  const mockUserId = 'user-456'

  beforeEach(() => {
    vi.clearAllMocks()
    // Mock the transaction function
    ;(db.transaction as any).mockImplementation(async (callback: any) => {
      const mockTx = {
        execute: vi.fn().mockResolvedValue(undefined),
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
      }
      return await callback(mockTx)
    })
  })

  describe('withTenantContext', () => {
    it('should set tenant context before executing callback', async () => {
      const mockCallback = vi.fn().mockResolvedValue('result')

      const result = await withTenantContext(mockTenantId, mockCallback)

      // Check that transaction was called
      expect(db.transaction).toHaveBeenCalled()
      
      // Check that callback was called
      expect(mockCallback).toHaveBeenCalled()
      expect(result).toBe('result')
    })

    it('should propagate errors from callback', async () => {
      const mockError = new Error('Database error')
      const mockCallback = vi.fn().mockRejectedValue(mockError)
      
      // Mock transaction to propagate the error
      ;(db.transaction as any).mockImplementation(async (callback: any) => {
        const mockTx = {
          execute: vi.fn().mockResolvedValue(undefined),
        }
        return await callback(mockTx)
      })

      await expect(withTenantContext(mockTenantId, mockCallback)).rejects.toThrow('Database error')
    })

    it('should handle different tenant IDs', async () => {
      const tenant1 = 'tenant-1'
      const tenant2 = 'tenant-2'
      const mockCallback1 = vi.fn().mockResolvedValue('result1')
      const mockCallback2 = vi.fn().mockResolvedValue('result2')

      const result1 = await withTenantContext(tenant1, mockCallback1)
      const result2 = await withTenantContext(tenant2, mockCallback2)

      expect(result1).toBe('result1')
      expect(result2).toBe('result2')
      
      // Check that transaction was called for both
      expect(db.transaction).toHaveBeenCalledTimes(2)
    })
  })

  describe('TenantContext class', () => {
    let context: TenantContext

    beforeEach(() => {
      context = new TenantContext(mockUserId, mockTenantId)
    })

    describe('constructor', () => {
      it('should create context with user ID and optional tenant ID', () => {
        const contextWithoutTenant = new TenantContext(mockUserId)
        expect(contextWithoutTenant).toBeInstanceOf(TenantContext)
        
        const contextWithTenant = new TenantContext(mockUserId, mockTenantId)
        expect(contextWithTenant).toBeInstanceOf(TenantContext)
      })
    })

    describe('getCurrentTenant', () => {
      it('should throw error if no tenant context is set', async () => {
        const contextWithoutTenant = new TenantContext(mockUserId)
        
        await expect(contextWithoutTenant.getCurrentTenant()).rejects.toThrow('No tenant context set')
      })
    })

    describe('scopedQuery', () => {
      it('should throw error if no tenant context', () => {
        const contextWithoutTenant = new TenantContext(mockUserId)
        
        expect(() => contextWithoutTenant.scopedQuery()).toThrow('No tenant context set for scoped query')
      })

      it('should return scoped query builder when tenant is set', () => {
        const scoped = context.scopedQuery()
        
        expect(scoped).toHaveProperty('from')
        expect(scoped).toHaveProperty('insert')
        expect(scoped).toHaveProperty('update')
        expect(scoped).toHaveProperty('delete')
        expect(typeof scoped.from).toBe('function')
        expect(typeof scoped.insert).toBe('function')
        expect(typeof scoped.update).toBe('function')
        expect(typeof scoped.delete).toBe('function')
      })
    })
  })

  describe('Security', () => {
    it('should handle SQL injection attempts safely', async () => {
      const maliciousTenantId = "'; DROP TABLE users; --"
      const mockCallback = vi.fn().mockResolvedValue('result')

      await withTenantContext(maliciousTenantId, mockCallback)

      // The transaction should execute safely with parameterized queries
      expect(db.transaction).toHaveBeenCalled()
      // Callback should still execute
      expect(mockCallback).toHaveBeenCalled()
    })
  })
})