import { getAuthUserWithTenant } from '@/lib/auth/session-utils'
import { redirect } from 'next/navigation'
import { DashboardSidebar } from './components/dashboard-sidebar'
import { DashboardHeader } from './components/dashboard-header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let userWithTenant
  
  try {
    userWithTenant = await getAuthUserWithTenant()
    
    // Ensure user has proper ID
    if (!userWithTenant.user.id) {
      redirect('/auth/login')
    }
  } catch (error) {
    // If no tenant context or access, redirect to onboarding
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader userWithTenant={userWithTenant} />
      
      <div className="flex">
        <DashboardSidebar userWithTenant={userWithTenant} />
        
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}