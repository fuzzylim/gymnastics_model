import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { AdminSidebar } from './components/admin-sidebar'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  
  // Admin access should be restricted - for now, check if user exists
  // In production, you'd want to check for specific admin roles or permissions
  if (!session?.user) {
    redirect('/login')
  }

  // TODO: Add proper admin role checking
  // For now, we'll allow any logged-in user to access admin panel for development
  // In production, this should check for system admin permissions

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