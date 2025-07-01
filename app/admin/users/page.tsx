import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, tenantMemberships, tenants } from '@/lib/db/schema'
import { eq, count, desc } from 'drizzle-orm'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default async function UsersPage() {
  const session = await auth()
  
  // Get all users with their membership counts and tenant info
  const usersWithData = await db
    .select({
      user: users,
      membershipCount: count(tenantMemberships.id),
    })
    .from(users)
    .leftJoin(tenantMemberships, eq(users.id, tenantMemberships.userId))
    .groupBy(users.id)
    .orderBy(desc(users.createdAt))

  // Get tenant memberships for each user
  const usersWithMemberships = await Promise.all(
    usersWithData.map(async (item) => {
      const memberships = await db.query.tenantMemberships.findMany({
        where: eq(tenantMemberships.userId, item.user.id),
        with: {
          tenant: true,
        },
        limit: 3, // Show only first 3 memberships
      })

      return {
        ...item,
        memberships,
      }
    })
  )

  const getRoleBadge = (role: string) => {
    const roleMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      owner: { variant: 'default' as const },
      admin: { variant: 'secondary' as const },
      member: { variant: 'outline' as const },
    }
    return roleMap[role] || { variant: 'outline' as const }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">
            Manage all user accounts across the system
          </p>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users ({usersWithMemberships.length})</CardTitle>
          <CardDescription>
            Complete list of registered users and their tenant memberships
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">User</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Memberships</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Primary Tenant</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Joined</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersWithMemberships.map((item) => {
                  const { user, membershipCount, memberships } = item
                  const primaryMembership = memberships[0] // First membership is primary
                  
                  return (
                    <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{user.name || 'Unnamed User'}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          {user.emailVerified && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{membershipCount}</span>
                          <span className="text-xs text-gray-500">
                            {membershipCount === 1 ? 'tenant' : 'tenants'}
                          </span>
                        </div>
                        {memberships.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {memberships.slice(0, 2).map((membership) => (
                              <Badge 
                                key={membership.id} 
                                variant={getRoleBadge(membership.role).variant}
                                className="text-xs"
                              >
                                {membership.role}
                              </Badge>
                            ))}
                            {memberships.length > 2 && (
                              <span className="text-xs text-gray-500">+{memberships.length - 2} more</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {primaryMembership ? (
                          <div>
                            <p className="text-sm font-medium">{primaryMembership.tenant.name}</p>
                            <p className="text-xs text-gray-500">/{primaryMembership.tenant.slug}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">No memberships</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            {usersWithMemberships.length === 0 && (
              <div className="text-center py-8">
                <p className="text-gray-500">No users found</p>
                <p className="text-sm text-gray-400 mt-1">
                  Users will appear here as they register accounts
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}