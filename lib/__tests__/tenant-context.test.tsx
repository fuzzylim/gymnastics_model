import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { TenantProvider, useTenant } from '../tenant-context'
import type { User } from '../db/schema'

// Mock fetch
global.fetch = vi.fn()

// Test component to access tenant context
function TestComponent() {
  const { currentTenant, userTenants, isLoading } = useTenant()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <div data-testid="current-tenant">
        {currentTenant ? currentTenant.name : 'No tenant'}
      </div>
      <div data-testid="tenant-count">{userTenants.length}</div>
    </div>
  )
}

describe('TenantContext', () => {
  const mockUser: User = {
    id: 'user-123',
    email: 'test@example.com',
    name: 'Test User',
    emailVerified: null,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render without user', async () => {
    render(
      <TenantProvider>
        <TestComponent />
      </TenantProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-tenant')).toHaveTextContent('No tenant')
      expect(screen.getByTestId('tenant-count')).toHaveTextContent('0')
    })
  })

  it('should fetch user tenants when user provided', async () => {
    const mockTenants = [
      {
        id: 'membership-1',
        tenantId: 'tenant-1',
        userId: 'user-123',
        role: 'owner',
        tenant: {
          id: 'tenant-1',
          slug: 'acme-corp',
          name: 'Acme Corporation',
        },
      },
    ]

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => mockTenants,
    } as Response)

    render(
      <TenantProvider user={mockUser}>
        <TestComponent />
      </TenantProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-tenant')).toHaveTextContent('Acme Corporation')
      expect(screen.getByTestId('tenant-count')).toHaveTextContent('1')
    })

    expect(global.fetch).toHaveBeenCalledWith('/api/user/tenants')
  })

  it('should handle fetch error gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))

    render(
      <TenantProvider user={mockUser}>
        <TestComponent />
      </TenantProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('current-tenant')).toHaveTextContent('No tenant')
      expect(screen.getByTestId('tenant-count')).toHaveTextContent('0')
    })
  })
})