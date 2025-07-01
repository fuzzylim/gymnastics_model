'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Tenant } from '@/lib/db/schema'

interface TenantActionsDropdownProps {
  tenant: Tenant
}

export default function TenantActionsDropdown({ tenant }: TenantActionsDropdownProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleViewTenant = () => {
    window.open(`/${tenant.slug}/dashboard`, '_blank')
  }

  const handleEditTenant = () => {
    // TODO: Implement edit tenant functionality
    alert('Edit tenant functionality not yet implemented')
  }

  const handleSuspendTenant = async () => {
    if (!confirm(`Are you sure you want to suspend ${tenant.name}?`)) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}/suspend`, {
        method: 'POST',
      })

      if (response.ok) {
        alert('Tenant suspended successfully')
        window.location.reload()
      } else {
        alert('Failed to suspend tenant')
      }
    } catch (error) {
      console.error('Failed to suspend tenant:', error)
      alert('Failed to suspend tenant')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteTenant = async () => {
    if (!confirm(`Are you sure you want to DELETE ${tenant.name}? This action cannot be undone.`)) {
      return
    }

    if (!confirm('This will permanently delete all data for this tenant. Type the tenant name to confirm.')) {
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        alert('Tenant deleted successfully')
        window.location.reload()
      } else {
        alert('Failed to delete tenant')
      }
    } catch (error) {
      console.error('Failed to delete tenant:', error)
      alert('Failed to delete tenant')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isLoading}>
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleViewTenant}>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          View Dashboard
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleEditTenant}>
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Edit Tenant
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem 
          onClick={handleSuspendTenant}
          className="text-orange-600 focus:text-orange-600"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          Suspend Tenant
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleDeleteTenant}
          className="text-red-600 focus:text-red-600"
        >
          <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Delete Tenant
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}