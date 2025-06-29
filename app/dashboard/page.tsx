import { getAuthSession } from '@/lib/auth/session-utils'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const session = await getAuthSession()
  
  if (!session) {
    redirect('/auth/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Dashboard
          </h1>
          
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Welcome!</h2>
              <p className="text-gray-600">
                Hello, {session.user?.name || session.user?.email}
              </p>
            </div>
            
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-900 mb-2">
                Session Information
              </h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(session, null, 2)}
              </pre>
            </div>
            
            <div className="border-t pt-4">
              <a
                href="/api/auth/signout"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Sign Out
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}