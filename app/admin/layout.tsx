import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { isUserSystemAdmin } from '@/lib/auth/admin-utils'
import { AdminSidebar } from './components/admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  // Check if user is authenticated
  if (!session?.user) {
    redirect('/login?callbackUrl=/admin')
  }

  // Check if user has system admin permissions
  if (!session.user.email || !isUserSystemAdmin(session.user)) {
    // Redirect to dashboard with error message
    redirect('/dashboard?error=access_denied')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex">
        <AdminSidebar user={session.user} />
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  )
}