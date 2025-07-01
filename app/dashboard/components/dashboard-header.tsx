'use client'

import { signOut } from 'next-auth/react'
import type { UserWithTenant } from '@/lib/types/auth'

interface DashboardHeaderProps {
  userWithTenant: UserWithTenant
}

export function DashboardHeader({ userWithTenant }: DashboardHeaderProps) {
  const { user, tenantSlug, role } = userWithTenant

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and tenant info */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-semibold text-gray-900">
                Gymnastics Model
              </h1>
            </div>
            {tenantSlug && (
              <div className="text-sm text-gray-500">
                <span className="px-2 py-1 bg-gray-100 rounded-md">
                  {tenantSlug}
                </span>
              </div>
            )}
          </div>

          {/* User menu */}
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">{user.name || user.email}</span>
              {role && (
                <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                  {role}
                </span>
              )}
            </div>
            
            <button
              onClick={() => signOut({ callbackUrl: '/auth/login' })}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}