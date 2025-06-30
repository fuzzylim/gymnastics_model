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

interface RemoveMemberDialogProps {
  isOpen: boolean
  onClose: () => void
  member: TeamMember
  currentUser: UserWithTenant
}

export function RemoveMemberDialog({ isOpen, onClose, member, currentUser }: RemoveMemberDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleRemove = async () => {
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/team/members/${member.id}`, {
        method: 'DELETE',
        headers: {
          'x-tenant-id': currentUser.tenantId,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove member')
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
                Remove Team Member
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

            <div className="mb-6">
              <div className="flex items-center mb-4">
                <div className="flex-shrink-0 mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                  <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.34 4.668c-.77-.833-2.003-.833-2.773 0L3.275 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
              
              <p className="text-sm text-gray-600 text-center">
                Are you sure you want to remove <strong>{member.user.name || member.user.email}</strong> from your team?
              </p>
              
              <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">
                  This action cannot be undone. The member will lose access to all team resources immediately.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleRemove}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Removing...' : 'Remove Member'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}