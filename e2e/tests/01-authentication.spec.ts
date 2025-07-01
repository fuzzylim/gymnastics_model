import { test, expect } from '@playwright/test'
import { testData } from '../fixtures/test-data'

test.describe('Phase 2: Authentication', () => {
  test.describe('Login Flow', () => {
    test('should show login page with passkey and email options', async ({ page }) => {
      await page.goto('/login')
      
      // Check for passkey option
      await expect(page.locator('text=Sign in with Passkey')).toBeVisible()
      
      // Check for email option
      await expect(page.locator('text=Send Magic Link')).toBeVisible()
    })

    test('should allow magic link authentication', async ({ page }) => {
      await page.goto('/login')
      
      // Enter email
      await page.fill('input[type="email"]', testData.users.owner.email)
      
      // Submit form
      await page.click('button:has-text("Send Magic Link")')
      
      // Should show success message
      await expect(page.locator('text=Check your email')).toBeVisible()
    })

    test('should validate email format', async ({ page }) => {
      await page.goto('/login')
      
      // Enter invalid email
      await page.fill('input[type="email"]', 'invalid-email')
      await page.click('button:has-text("Send Magic Link")')
      
      // Should show validation error
      await expect(page.locator('text=Please enter a valid email')).toBeVisible()
    })
  })

  test.describe('Registration Flow', () => {
    test('should show registration page with passkey option', async ({ page }) => {
      await page.goto('/register')
      
      // Check for registration form
      await expect(page.locator('h1:has-text("Create Account")')).toBeVisible()
      
      // Check for passkey registration option
      await expect(page.locator('text=Register with Passkey')).toBeVisible()
    })

    test('should show email registration fallback', async ({ page }) => {
      await page.goto('/register')
      
      // Should have email option
      await expect(page.locator('text=Send Magic Link')).toBeVisible()
    })
  })

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access dashboard without authentication
      await page.goto('/dashboard')
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*\/login/)
    })

    test('should redirect to onboarding for users without tenant', async ({ page }) => {
      // This would require a user without tenant membership
      // For now, we'll skip this as it requires database setup
      test.skip()
    })
  })
})