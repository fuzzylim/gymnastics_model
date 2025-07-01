import { auth } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'

export default async function SystemSettingsPage() {
  const session = await auth()
  
  // In a real implementation, these would come from a database
  const systemSettings = {
    general: {
      siteName: 'Gymnastics Model',
      maintenanceMode: false,
      userRegistration: true,
      tenantCreation: true,
      maxTenantsPerUser: 5,
    },
    security: {
      passwordPolicy: 'medium',
      mfaRequired: false,
      sessionTimeout: 24, // hours
      maxLoginAttempts: 5,
    },
    notifications: {
      emailNotifications: true,
      systemAlerts: true,
      userWelcomeEmail: true,
      adminNotifications: true,
    },
    api: {
      rateLimitEnabled: true,
      requestsPerMinute: 60,
      webhooksEnabled: true,
      apiKeysEnabled: false,
    },
  }

  const systemInfo = {
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL',
    lastUpdated: new Date().toISOString(),
    uptime: '45 days, 12 hours',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">
          Configure global system settings and preferences
        </p>
      </div>

      {/* System Information */}
      <Card>
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>
            Current system status and configuration
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Version</p>
              <p className="text-lg">{systemInfo.version}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Environment</p>
              <Badge variant={systemInfo.environment === 'production' ? 'default' : 'secondary'}>
                {systemInfo.environment}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Database</p>
              <p className="text-lg">{systemInfo.database}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Uptime</p>
              <p className="text-lg">{systemInfo.uptime}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Last Updated</p>
              <p className="text-sm text-gray-600">
                {new Date(systemInfo.lastUpdated).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
          <CardDescription>
            Basic system configuration options
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-sm text-gray-600">Temporarily disable access to the system</p>
            </div>
            <Switch 
              checked={systemSettings.general.maintenanceMode}
              // In real app, this would trigger an API call
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">User Registration</p>
              <p className="text-sm text-gray-600">Allow new users to register accounts</p>
            </div>
            <Switch checked={systemSettings.general.userRegistration} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Tenant Creation</p>
              <p className="text-sm text-gray-600">Allow users to create new tenants</p>
            </div>
            <Switch checked={systemSettings.general.tenantCreation} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Max Tenants Per User</p>
              <p className="text-sm text-gray-600">Limit how many tenants a user can belong to</p>
            </div>
            <span className="text-sm font-medium">{systemSettings.general.maxTenantsPerUser}</span>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Security Settings</CardTitle>
          <CardDescription>
            Authentication and security configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Multi-Factor Authentication</p>
              <p className="text-sm text-gray-600">Require MFA for all user accounts</p>
            </div>
            <Switch checked={systemSettings.security.mfaRequired} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Session Timeout</p>
              <p className="text-sm text-gray-600">Hours until sessions expire</p>
            </div>
            <span className="text-sm font-medium">{systemSettings.security.sessionTimeout}h</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Password Policy</p>
              <p className="text-sm text-gray-600">Strength requirements for passwords</p>
            </div>
            <Badge variant="secondary">{systemSettings.security.passwordPolicy}</Badge>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Max Login Attempts</p>
              <p className="text-sm text-gray-600">Failed attempts before account lockout</p>
            </div>
            <span className="text-sm font-medium">{systemSettings.security.maxLoginAttempts}</span>
          </div>
        </CardContent>
      </Card>

      {/* API & Integrations */}
      <Card>
        <CardHeader>
          <CardTitle>API & Integrations</CardTitle>
          <CardDescription>
            External API and webhook configuration
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Rate Limiting</p>
              <p className="text-sm text-gray-600">Enable API rate limiting</p>
            </div>
            <Switch checked={systemSettings.api.rateLimitEnabled} />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Requests Per Minute</p>
              <p className="text-sm text-gray-600">API rate limit threshold</p>
            </div>
            <span className="text-sm font-medium">{systemSettings.api.requestsPerMinute}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Webhooks</p>
              <p className="text-sm text-gray-600">Enable webhook functionality</p>
            </div>
            <Switch checked={systemSettings.api.webhooksEnabled} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">API Keys</p>
              <p className="text-sm text-gray-600">Allow API key authentication</p>
            </div>
            <Switch checked={systemSettings.api.apiKeysEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Actions</CardTitle>
          <CardDescription>
            Administrative actions and maintenance tools
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button variant="outline" className="justify-start">
              💾 Backup Database
            </Button>
            <Button variant="outline" className="justify-start">
              🔄 Clear Cache
            </Button>
            <Button variant="outline" className="justify-start">
              📊 Export Analytics
            </Button>
            <Button variant="outline" className="justify-start">
              🔍 System Health Check
            </Button>
            <Button variant="outline" className="justify-start">
              📧 Test Email Service
            </Button>
            <Button variant="outline" className="justify-start">
              🧹 Cleanup Orphaned Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}