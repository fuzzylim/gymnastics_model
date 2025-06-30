import { test as base, Page } from '@playwright/test'
import { testData } from './test-data'

type AuthFixtures = {
  authenticatedPage: Page
  ownerPage: Page
  adminPage: Page
  memberPage: Page
}

// Helper to perform magic link authentication
async function authenticateWithMagicLink(page: Page, email: string) {
  await page.goto('/login')
  
  // Click on magic link option if passkeys not available
  await page.click('text=Continue with Email')
  
  // Enter email
  await page.fill('input[type="email"]', email)
  await page.click('button:has-text("Send Magic Link")')
  
  // In development, the magic link is logged to console
  // We'll simulate clicking the link by navigating directly
  // In a real test environment, you'd intercept the email
  await page.waitForTimeout(1000)
  
  // For testing, we'll assume the session is created
  // In production, you'd need to handle the actual magic link flow
  await page.goto('/dashboard')
  await page.waitForURL('**/dashboard')
}

// Helper to create a tenant if needed
async function ensureTenantExists(page: Page) {
  // Check if we're on onboarding page
  if (page.url().includes('/onboarding')) {
    // Create a new tenant
    await page.click('button:has-text("Create New Tenant")')
    await page.fill('input[name="name"]', testData.tenant.name)
    await page.fill('input[name="slug"]', testData.tenant.slug)
    await page.fill('textarea[name="description"]', testData.tenant.description)
    await page.click('button[type="submit"]')
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard')
  }
}

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Basic authenticated page without specific role
    await authenticateWithMagicLink(page, testData.users.owner.email)
    await ensureTenantExists(page)
    await use(page)
  },

  ownerPage: async ({ page }, use) => {
    await authenticateWithMagicLink(page, testData.users.owner.email)
    await ensureTenantExists(page)
    await use(page)
  },

  adminPage: async ({ page }, use) => {
    await authenticateWithMagicLink(page, testData.users.admin.email)
    await ensureTenantExists(page)
    await use(page)
  },

  memberPage: async ({ page }, use) => {
    await authenticateWithMagicLink(page, testData.users.member.email)
    await ensureTenantExists(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'