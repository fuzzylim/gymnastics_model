import { test, expect } from '@playwright/test'

test.describe('Smoke Tests', () => {
  test('should load the homepage', async ({ page }) => {
    await page.goto('/')
    
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/Gymnastics Model/)
  })

  test('should load the login page', async ({ page }) => {
    await page.goto('/login')
    
    // Check for login form elements
    await expect(page.locator('text=Sign in to your account')).toBeVisible()
    await expect(page.locator('text=Sign in with Passkey')).toBeVisible()
    await expect(page.locator('text=Send Magic Link')).toBeVisible()
  })

  test('should load the registration page', async ({ page }) => {
    await page.goto('/register')
    
    // Check that registration page loads
    await expect(page.locator('h2:has-text("Create your account")')).toBeVisible()
  })

  test('should redirect dashboard to login for unauthenticated users', async ({ page }) => {
    await page.goto('/dashboard')
    
    // Should redirect to login or auth page
    await page.waitForURL(/\/(login|auth)/, { timeout: 10000 })
  })

  test('should load admin page (may redirect to login)', async ({ page }) => {
    await page.goto('/admin')
    
    // Should either show admin page or redirect to login
    const currentUrl = page.url()
    expect(currentUrl).toMatch(/\/(admin|login|auth)/)
  })
})