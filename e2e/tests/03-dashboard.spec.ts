import { test, expect } from '../fixtures/auth.fixture'

test.describe('Phase 4: Dashboard', () => {
  test('should display dashboard with all components', async ({ authenticatedPage }) => {
    // Should be on dashboard
    await expect(authenticatedPage).toHaveURL(/.*\/dashboard/)
    
    // Check header
    await expect(authenticatedPage.locator('text=Dashboard')).toBeVisible()
    
    // Check sidebar navigation
    await expect(authenticatedPage.locator('nav >> text=Dashboard')).toBeVisible()
    await expect(authenticatedPage.locator('nav >> text=Team')).toBeVisible()
    await expect(authenticatedPage.locator('nav >> text=Settings')).toBeVisible()
    
    // Check main dashboard components
    await expect(authenticatedPage.locator('text=Total Members')).toBeVisible()
    await expect(authenticatedPage.locator('text=Active Members')).toBeVisible()
    await expect(authenticatedPage.locator('text=Pending Invites')).toBeVisible()
    await expect(authenticatedPage.locator('text=Your Role')).toBeVisible()
  })

  test('should show recent activity feed', async ({ authenticatedPage }) => {
    await expect(authenticatedPage.locator('text=Recent Activity')).toBeVisible()
    
    // Should show activity items or empty state
    const activityList = authenticatedPage.locator('text=Recent Activity').locator('..')
    await expect(activityList).toBeVisible()
  })

  test('should show quick actions based on role', async ({ ownerPage }) => {
    await expect(ownerPage.locator('text=Quick Actions')).toBeVisible()
    
    // Owner should see all actions
    await expect(ownerPage.locator('text=Invite Team Member')).toBeVisible()
    await expect(ownerPage.locator('text=View Analytics')).toBeVisible()
    await expect(ownerPage.locator('text=Update Settings')).toBeVisible()
    await expect(ownerPage.locator('text=Billing & Usage')).toBeVisible()
  })

  test('should hide admin-only actions from members', async ({ memberPage }) => {
    // Member should not see certain actions
    await expect(memberPage.locator('text=Invite Team Member')).not.toBeVisible()
    await expect(memberPage.locator('text=Update Settings')).not.toBeVisible()
    await expect(memberPage.locator('text=Billing & Usage')).not.toBeVisible()
    
    // But should see general actions
    await expect(memberPage.locator('text=View Analytics')).toBeVisible()
  })

  test('should navigate between dashboard sections', async ({ authenticatedPage }) => {
    // Click on Team in sidebar
    await authenticatedPage.click('nav >> text=Team')
    await expect(authenticatedPage).toHaveURL(/.*\/dashboard\/team/)
    
    // Click on Settings
    await authenticatedPage.click('nav >> text=Settings')
    await expect(authenticatedPage).toHaveURL(/.*\/dashboard\/settings/)
    
    // Go back to dashboard
    await authenticatedPage.click('nav >> text=Dashboard')
    await expect(authenticatedPage).toHaveURL(/.*\/dashboard$/)
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    // Authenticate
    await page.goto('/login')
    // ... perform authentication ...
    
    // Check mobile menu toggle exists
    await expect(page.locator('button[aria-label="Toggle menu"]')).toBeVisible()
  })
})