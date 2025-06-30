import { test, expect } from '@playwright/test'
import { testData } from '../fixtures/test-data'

test.describe('Complete User Journey', () => {
  test('should complete full owner journey from registration to team setup', async ({ page }) => {
    // 1. Registration
    await page.goto('/register')
    await page.click('text=Continue with Email')
    await page.fill('input[type="email"]', 'journey-test@example.com')
    await page.click('button:has-text("Continue")')
    
    // In real test, handle magic link
    // For now, we'll assume authenticated and skip to onboarding
    
    // 2. Onboarding - Create Tenant
    await page.goto('/onboarding')
    await page.click('button:has-text("Create New Tenant")')
    await page.fill('input[name="name"]', 'Journey Test Company')
    await page.fill('input[name="slug"]', 'journey-test')
    await page.fill('textarea[name="description"]', 'E2E test company')
    await page.click('button[type="submit"]')
    
    // 3. Dashboard - Verify landing
    await expect(page).toHaveURL(/.*\/dashboard/)
    await expect(page.locator('text=Welcome')).toBeVisible()
    await expect(page.locator('text=Your Role: owner')).toBeVisible()
    
    // 4. Team Management - Invite members
    await page.click('nav >> text=Team')
    await page.click('button:has-text("Invite Member")')
    await page.fill('input[type="email"]', 'team-member@example.com')
    await page.selectOption('select#role', 'admin')
    await page.click('button:has-text("Send Invitation")')
    await expect(page.locator('text=Invitation sent')).toBeVisible()
    
    // 5. Settings - Configure tenant
    await page.click('nav >> text=Settings')
    
    // Update general settings
    await page.selectOption('select#timezone', 'America/New_York')
    await page.click('button:has-text("Save Preferences")')
    await expect(page.locator('text=Settings saved successfully')).toBeVisible()
    
    // Configure features
    await page.click('button:has-text("🚀 Features")')
    const chatToggle = page.locator('input[type="checkbox"]').filter({ 
      has: page.locator('text=Team Chat') 
    })
    if (await chatToggle.isEnabled()) {
      await chatToggle.click()
      await page.click('button:has-text("Save Features")')
    }
    
    // 6. Quick Actions - Test workflow
    await page.click('nav >> text=Dashboard')
    await page.click('text=View Analytics')
    
    // Should navigate to analytics (when implemented)
    // For now, just verify navigation attempt
  })

  test('should complete member journey joining existing team', async ({ page }) => {
    // This test assumes invitation link exists
    test.skip()
    
    // 1. Click invitation link
    // 2. Register/login
    // 3. Accept invitation
    // 4. Land on dashboard as member
    // 5. Verify limited access
  })

  test('should handle errors gracefully throughout journey', async ({ page }) => {
    // Test error scenarios
    
    // 1. Registration with existing email
    await page.goto('/register')
    await page.click('text=Continue with Email')
    await page.fill('input[type="email"]', testData.users.owner.email)
    await page.click('button:has-text("Continue")')
    await expect(page.locator('text=already exists')).toBeVisible()
    
    // 2. Creating tenant with duplicate slug
    await page.goto('/onboarding')
    await page.click('button:has-text("Create New Tenant")')
    await page.fill('input[name="slug"]', testData.tenant.slug)
    await page.click('button[type="submit"]')
    await expect(page.locator('text=already taken')).toBeVisible()
    
    // 3. Accessing unauthorized resources
    // Would need member account to test
  })
})