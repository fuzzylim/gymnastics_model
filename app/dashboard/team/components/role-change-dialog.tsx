'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { UserWithTenant } from '@/lib/types/auth'

interface TeamMember {
  id: string
  role: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

interface RoleChangeDialogProps {
  isOpen: boolean
  onClose: () => void
  member: TeamMember
  currentUser: UserWithTenant
}

export function RoleChangeDialog({ isOpen, onClose, member, currentUser }: RoleChangeDialogProps) {
  const [newRole, setNewRole] = useState<'member' | 'admin' | 'owner'>(member.role as any)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const isOwner = currentUser.role === 'owner'
  const availableRoles = isOwner 
    ? [{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }, { value: 'owner', label: 'Owner' }]
    : [{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin' }]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-tenant-id': currentUser.tenantId,
        },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member role')
      }

      router.refresh()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full mx-auto">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Change Member Role
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Changing role for <strong>{member.user.name || member.user.email}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  New Role
                </label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  disabled={isLoading}
                >
                  {availableRoles.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
                <div className="mt-2 text-xs text-gray-500">
                  {newRole === 'owner' && (
                    <p>⚠️ Owners have full access to all tenant settings and billing</p>
                  )}
                  {newRole === 'admin' && (
                    <p>👑 Admins can invite members and manage team settings</p>
                  )}
                  {newRole === 'member' && (
                    <p>👤 Members have access to basic features</p>
                  )}
                </div>
              </div>

              {newRole === 'owner' && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Warning:</strong> This person will have complete control over this tenant, 
                    including the ability to remove you as an owner.
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
                  disabled={isLoading || newRole === member.role}
                >
                  {isLoading ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}