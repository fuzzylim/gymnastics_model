'use client'

import { useState } from 'react'
import type { UserWithTenant } from '@/lib/types/auth'
import { InviteMemberDialog } from './invite-member-dialog'

interface InviteMemberButtonProps {
  userWithTenant: UserWithTenant
}

export function InviteMemberButton({ userWithTenant }: InviteMemberButtonProps) {
  const [showDialog, setShowDialog] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        <svg className="-ml-0.5 mr-1.5 h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
        </svg>
        Invite Member
      </button>

      <InviteMemberDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        userWithTenant={userWithTenant}
      />
    </>
  )
}