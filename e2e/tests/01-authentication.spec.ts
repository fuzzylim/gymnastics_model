import { test, expect } from '@playwright/test'

test.describe('Phase 2: Authentication', () => {
  test.describe('Login Flow', () => {
    test('should show login page with passkey and email options', async ({ page }) => {
      await page.goto('/login')
      
      // Check for passkey option
      await expect(page.locator('text=Sign in with Passkey')).toBeVisible()
      
      // Check for email option
      await expect(page.locator('text=Send Magic Link')).toBeVisible()
    })


  })


})