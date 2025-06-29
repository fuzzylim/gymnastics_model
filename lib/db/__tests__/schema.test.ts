import { describe, it, expect } from 'vitest'
import { 
  tenants, 
  users, 
  tenantMemberships, 
  credentials,
  authChallenges,
  sessions,
  userRoleEnum,
  subscriptionStatusEnum
} from '../schema'

describe('Database Schema', () => {
  describe('Table Definitions', () => {
    it('should have tenants table defined', () => {
      expect(tenants).toBeDefined()
      expect(typeof tenants).toBe('object')
    })

    it('should have users table defined', () => {
      expect(users).toBeDefined()
      expect(typeof users).toBe('object')
    })

    it('should have tenant_memberships table defined', () => {
      expect(tenantMemberships).toBeDefined()
      expect(typeof tenantMemberships).toBe('object')
    })

    it('should have credentials table defined', () => {
      expect(credentials).toBeDefined()
      expect(typeof credentials).toBe('object')
    })

    it('should have auth_challenges table defined', () => {
      expect(authChallenges).toBeDefined()
      expect(typeof authChallenges).toBe('object')
    })

    it('should have sessions table defined', () => {
      expect(sessions).toBeDefined()
      expect(typeof sessions).toBe('object')
    })
  })

  describe('Enums', () => {
    it('should have user role enum with correct values', () => {
      expect(userRoleEnum).toBeDefined()
      expect(userRoleEnum.enumValues).toEqual(['owner', 'admin', 'member', 'viewer'])
    })

    it('should have subscription status enum with correct values', () => {
      expect(subscriptionStatusEnum).toBeDefined()
      expect(subscriptionStatusEnum.enumValues).toEqual(['active', 'cancelled', 'past_due', 'trialing'])
    })
  })

  describe('Table Columns', () => {
    it('tenants table should have required columns', () => {
      expect(tenants.id).toBeDefined()
      expect(tenants.slug).toBeDefined()
      expect(tenants.name).toBeDefined()
      expect(tenants.subscriptionStatus).toBeDefined()
      expect(tenants.createdAt).toBeDefined()
      expect(tenants.updatedAt).toBeDefined()
    })

    it('users table should have required columns', () => {
      expect(users.id).toBeDefined()
      expect(users.email).toBeDefined()
      expect(users.name).toBeDefined()
      expect(users.emailVerified).toBeDefined()
      expect(users.createdAt).toBeDefined()
      expect(users.updatedAt).toBeDefined()
    })

    it('tenant_memberships table should have required columns', () => {
      expect(tenantMemberships.id).toBeDefined()
      expect(tenantMemberships.tenantId).toBeDefined()
      expect(tenantMemberships.userId).toBeDefined()
      expect(tenantMemberships.role).toBeDefined()
      expect(tenantMemberships.invitedBy).toBeDefined()
      expect(tenantMemberships.joinedAt).toBeDefined()
    })

    it('credentials table should have WebAuthn columns', () => {
      expect(credentials.id).toBeDefined()
      expect(credentials.userId).toBeDefined()
      expect(credentials.credentialId).toBeDefined()
      expect(credentials.publicKey).toBeDefined()
      expect(credentials.counter).toBeDefined()
      expect(credentials.transports).toBeDefined()
    })
  })
})