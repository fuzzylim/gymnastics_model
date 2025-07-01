'use client'

import { useState } from 'react'
import type { UserWithTenant } from '@/lib/types/auth'
import { RoleChangeDialog } from './role-change-dialog'
import { RemoveMemberDialog } from './remove-member-dialog'

interface TeamMember {
  id: string
  role: string
  invitedAt: Date | null
  joinedAt: Date | null
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    email: string
    name: string | null
    image: string | null
    createdAt: Date
  }
  inviter: {
    id: string
    email: string
    name: string | null
  } | null
}

interface TeamMembersListProps {
  members: TeamMember[]
  currentUser: UserWithTenant
}

export function TeamMembersList({ members, currentUser }: TeamMembersListProps) {
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [showRoleDialog, setShowRoleDialog] = useState(false)
  const [showRemoveDialog, setShowRemoveDialog] = useState(false)

  const canManageMembers = ['owner', 'admin'].includes(currentUser.role || '')
  const isOwner = currentUser.role === 'owner'

  const formatDate = (date: Date | null) => {
    if (!date) return 'Pending'
    return new Intl.DateTimeFormat('en-AU', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(new Date(date))
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800'
      case 'admin':
        return 'bg-blue-100 text-blue-800'
      case 'member':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const canModifyMember = (member: TeamMember) => {
    if (!canManageMembers) return false
    if (member.user.id === currentUser.user.id) return false // Can't modify self
    if (member.role === 'owner' && !isOwner) return false // Only owners can modify owners
    return true
  }

  const handleRoleChange = (member: TeamMember) => {
    setSelectedMember(member)
    setShowRoleDialog(true)
  }

  const handleRemoveMember = (member: TeamMember) => {
    setSelectedMember(member)
    setShowRemoveDialog(true)
  }

  return (
    <>
      <div className="flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Member
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Role
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Joined
                  </th>
                  {canManageMembers && (
                    <th className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {members.map((member) => (
                  <tr key={member.id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 sm:pl-0">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0">
                          {member.user.image ? (
                            <img
                              className="h-10 w-10 rounded-full"
                              src={member.user.image}
                              alt=""
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {member.user.name?.charAt(0) || member.user.email.charAt(0)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {member.user.name || 'Unnamed User'}
                            {member.user.id === currentUser.user.id && (
                              <span className="ml-2 text-xs text-gray-500">(You)</span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {member.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                        {member.role}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {member.joinedAt ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                          Invited
                        </span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div>
                        {formatDate(member.joinedAt)}
                        {member.inviter && !member.joinedAt && (
                          <div className="text-xs text-gray-400">
                            Invited by {member.inviter.name || member.inviter.email}
                          </div>
                        )}
                      </div>
                    </td>
                    {canManageMembers && (
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        {canModifyMember(member) && (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleRoleChange(member)}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                            >
                              Change Role
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member)}
                              className="text-red-600 hover:text-red-900 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {members.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-4xl mb-4">👥</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members yet</h3>
          <p className="text-gray-500">
            {canManageMembers 
              ? "Start building your team by inviting members."
              : "Your team administrator will add members soon."
            }
          </p>
        </div>
      )}

      {selectedMember && (
        <>
          <RoleChangeDialog
            isOpen={showRoleDialog}
            onClose={() => {
              setShowRoleDialog(false)
              setSelectedMember(null)
            }}
            member={selectedMember}
            currentUser={currentUser}
          />
          <RemoveMemberDialog
            isOpen={showRemoveDialog}
            onClose={() => {
              setShowRemoveDialog(false)
              setSelectedMember(null)
            }}
            member={selectedMember}
            currentUser={currentUser}
          />
        </>
      )}
    </>
  )
}