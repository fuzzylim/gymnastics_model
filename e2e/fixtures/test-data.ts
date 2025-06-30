export const testData = {
  users: {
    owner: {
      email: 'owner@example.com',
      name: 'Test Owner',
    },
    admin: {
      email: 'admin@example.com',
      name: 'Test Admin',
    },
    member: {
      email: 'member@example.com',
      name: 'Test Member',
    },
  },
  tenant: {
    name: 'Test Company',
    slug: 'test-company',
    description: 'A test company for E2E testing',
  },
  settings: {
    general: {
      timezone: 'America/New_York',
      locale: 'en-US',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
    },
    branding: {
      primaryColor: '#4f46e5',
      secondaryColor: '#7c3aed',
      accentColor: '#f59e0b',
    },
    security: {
      sessionTimeout: 60,
      minPasswordLength: 10,
    },
  },
}