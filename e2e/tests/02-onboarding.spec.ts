import { test, expect } from '../fixtures/auth.fixture'
import { testData } from '../fixtures/test-data'

test.describe('Phase 3: Onboarding & Tenant Creation', () => {
  test('should show onboarding page for new users', async ({ page }) => {
    // Simulate a new user without tenant
    await page.goto('/onboarding')
    
    // Should show welcome message
    await expect(page.locator('h1:has-text("Welcome")')).toBeVisible()
    
    // Should show options
    await expect(page.locator('text=Create a new tenant')).toBeVisible()
    await expect(page.locator('text=Join existing team')).toBeVisible()
  })

  test('should allow creating a new tenant', async ({ page }) => {
    await page.goto('/onboarding')
    
    // Click create new tenant
    await page.click('button:has-text("Create New Tenant")')
    
    // Fill in tenant details
    await page.fill('input[name="name"]', 'New Test Company')
    await page.fill('input[name="slug"]', 'new-test-company')
    await page.fill('textarea[name="description"]', 'A brand new test company')
    
    // Submit form
    await page.click('button[type="submit"]')
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*\/dashboard/)
  })

  test('should validate tenant slug format', async ({ page }) => {
    await page.goto('/onboarding')
    await page.click('button:has-text("Create New Tenant")')
    
    // Try invalid slug
    await page.fill('input[name="slug"]', 'Invalid Slug!')
    
    // Should show validation error
    await expect(page.locator('text=Only lowercase letters, numbers, and hyphens')).toBeVisible()
  })

  test('should check for duplicate tenant slugs', async ({ page }) => {
    await page.goto('/onboarding')
    await page.click('button:has-text("Create New Tenant")')
    
    // Try existing slug
    await page.fill('input[name="name"]', 'Duplicate Company')
    await page.fill('input[name="slug"]', testData.tenant.slug)
    
    await page.click('button[type="submit"]')
    
    // Should show error
    await expect(page.locator('text=already taken')).toBeVisible()
  })

  test('should show existing teams if user belongs to any', async ({ authenticatedPage }) => {
    // This test assumes user already has teams
    await authenticatedPage.goto('/onboarding')
    
    // Should show existing teams section
    await expect(authenticatedPage.locator('text=Your Teams')).toBeVisible()
  })
})