'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Tenant, User, TenantMembership } from './db/schema'

interface TenantContextValue {
  currentTenant: Tenant | null
  userTenants: (TenantMembership & { tenant: Tenant })[]
  currentUserRole: string | null
  isLoading: boolean
  switchTenant: (tenantSlug: string) => Promise<void>
  refreshTenants: () => Promise<void>
}

const TenantContext = createContext<TenantContextValue | null>(null)

interface TenantProviderProps {
  children: React.ReactNode
  user?: User | null
  initialTenant?: Tenant | null
}

export function TenantProvider({ children, user, initialTenant }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(initialTenant || null)
  const [userTenants, setUserTenants] = useState<(TenantMembership & { tenant: Tenant })[]>([])
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchUserTenants = useCallback(async () => {
    if (!user) {
      setUserTenants([])
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/user/tenants')
      if (response.ok) {
        const tenants = await response.json()
        setUserTenants(tenants)
        
        // Set current tenant if not already set
        if (!currentTenant && tenants.length > 0) {
          setCurrentTenant(tenants[0].tenant)
        }
        
        // Set current user role
        if (currentTenant) {
          const membership = tenants.find((t: TenantMembership & { tenant: Tenant }) => t.tenant.id === currentTenant.id)
          setCurrentUserRole(membership?.role || null)
        }
      }
    } catch (error) {
      console.error('Failed to fetch user tenants:', error)
    } finally {
      setIsLoading(false)
    }
  }, [user, currentTenant])

  const switchTenant = async (tenantSlug: string) => {
    const tenantMembership = userTenants.find(ut => ut.tenant.slug === tenantSlug)
    if (tenantMembership) {
      setCurrentTenant(tenantMembership.tenant)
      setCurrentUserRole(tenantMembership.role)
      
      // Update URL to reflect tenant switch
      const currentPath = window.location.pathname
      const newPath = currentPath.replace(/^\/[^\/]+/, `/${tenantSlug}`)
      window.history.pushState({}, '', newPath)
    }
  }

  const refreshTenants = async () => {
    setIsLoading(true)
    await fetchUserTenants()
  }

  useEffect(() => {
    fetchUserTenants()
  }, [fetchUserTenants])

  useEffect(() => {
    if (currentTenant && userTenants.length > 0) {
      const membership = userTenants.find(ut => ut.tenant.id === currentTenant.id)
      setCurrentUserRole(membership?.role || null)
    }
  }, [currentTenant, userTenants])

  const value: TenantContextValue = {
    currentTenant,
    userTenants,
    currentUserRole,
    isLoading,
    switchTenant,
    refreshTenants,
  }

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  )
}

export function useTenant() {
  const context = useContext(TenantContext)
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider')
  }
  return context
}

export function useRequiredTenant() {
  const { currentTenant, isLoading } = useTenant()
  
  if (isLoading) {
    return { tenant: null, isLoading: true }
  }
  
  if (!currentTenant) {
    throw new Error('No tenant available')
  }
  
  return { tenant: currentTenant, isLoading: false }
}