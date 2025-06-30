import { test, expect } from '../fixtures/auth.fixture'

test.describe('Performance Tests', () => {
  test('should load dashboard within acceptable time', async ({ authenticatedPage }) => {
    const startTime = Date.now()
    
    await authenticatedPage.goto('/dashboard')
    await authenticatedPage.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Dashboard should load within 3 seconds
    expect(loadTime).toBeLessThan(3000)
  })

  test('should handle rapid navigation without errors', async ({ authenticatedPage }) => {
    // Rapidly navigate between pages
    const pages = [
      '/dashboard',
      '/dashboard/team',
      '/dashboard/settings',
      '/dashboard',
      '/dashboard/team',
    ]

    for (const page of pages) {
      await authenticatedPage.goto(page)
      // Should not show any errors
      await expect(authenticatedPage.locator('text=Error')).not.toBeVisible()
      await expect(authenticatedPage.locator('text=Something went wrong')).not.toBeVisible()
    }
  })

  test('should efficiently render large team lists', async ({ ownerPage }) => {
    // This test would need a tenant with many members
    test.skip()
    
    await ownerPage.goto('/dashboard/team')
    
    const startTime = Date.now()
    await ownerPage.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime
    
    // Even with many members, should load quickly
    expect(loadTime).toBeLessThan(2000)
  })

  test('should handle concurrent API requests', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/dashboard')
    
    // The dashboard makes multiple API calls
    // They should complete without errors
    await authenticatedPage.waitForLoadState('networkidle')
    
    // Check no error states
    await expect(authenticatedPage.locator('text=Failed to load')).not.toBeVisible()
  })

  test('should cache settings appropriately', async ({ ownerPage }) => {
    // First load
    await ownerPage.goto('/dashboard/settings')
    await ownerPage.waitForLoadState('networkidle')
    
    // Navigate away and back
    await ownerPage.goto('/dashboard')
    
    const startTime = Date.now()
    await ownerPage.goto('/dashboard/settings')
    await ownerPage.waitForLoadState('networkidle')
    const secondLoadTime = Date.now() - startTime
    
    // Second load should be faster due to caching
    expect(secondLoadTime).toBeLessThan(1000)
  })
})