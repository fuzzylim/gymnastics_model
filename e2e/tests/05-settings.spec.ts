import { test, expect } from '../fixtures/auth.fixture'
import { testData } from '../fixtures/test-data'

test.describe('Phase 4: Settings Management', () => {
  test.describe('Access Control', () => {
    test('should show settings link for admins', async ({ ownerPage }) => {
      await expect(ownerPage.locator('nav >> text=Settings')).toBeVisible()
    })

    test('should hide settings link from members', async ({ memberPage }) => {
      await expect(memberPage.locator('nav >> text=Settings')).not.toBeVisible()
    })

    test('should redirect members trying to access settings directly', async ({ memberPage }) => {
      await memberPage.goto('/dashboard/settings')
      await expect(memberPage).toHaveURL(/.*\/dashboard/)
    })
  })

  test.describe('Settings Tabs', () => {
    test.beforeEach(async ({ ownerPage }) => {
      await ownerPage.goto('/dashboard/settings')
    })

    test('should display all settings tabs', async ({ ownerPage }) => {
      // Check all tabs are visible
      await expect(ownerPage.locator('button:has-text("⚙️ General")')).toBeVisible()
      await expect(ownerPage.locator('button:has-text("🎨 Branding")')).toBeVisible()
      await expect(ownerPage.locator('button:has-text("🚀 Features")')).toBeVisible()
      await expect(ownerPage.locator('button:has-text("🔒 Security")')).toBeVisible()
      await expect(ownerPage.locator('button:has-text("🔔 Notifications")')).toBeVisible()
      await expect(ownerPage.locator('button:has-text("📊 Limits & Usage")')).toBeVisible()
      await expect(ownerPage.locator('button:has-text("🔌 Integrations")')).toBeVisible()
    })

    test('should switch between tabs', async ({ ownerPage }) => {
      // Click on Branding tab
      await ownerPage.click('button:has-text("🎨 Branding")')
      await expect(ownerPage.locator('h3:has-text("Branding & Customisation")')).toBeVisible()
      
      // Click on Features tab
      await ownerPage.click('button:has-text("🚀 Features")')
      await expect(ownerPage.locator('h3:has-text("Feature Toggles")')).toBeVisible()
    })
  })

  test.describe('General Settings', () => {
    test.beforeEach(async ({ ownerPage }) => {
      await ownerPage.goto('/dashboard/settings')
    })

    test('should show tenant profile for owners', async ({ ownerPage }) => {
      await expect(ownerPage.locator('h3:has-text("Tenant Profile")')).toBeVisible()
      await expect(ownerPage.locator('label:has-text("Tenant Name")')).toBeVisible()
      await expect(ownerPage.locator('label:has-text("URL Slug")')).toBeVisible()
    })

    test('should not show tenant profile for admins', async ({ adminPage }) => {
      await adminPage.goto('/dashboard/settings')
      await expect(adminPage.locator('h3:has-text("Tenant Profile")')).not.toBeVisible()
    })

    test('should update general preferences', async ({ ownerPage }) => {
      // Change timezone
      await ownerPage.selectOption('select#timezone', testData.settings.general.timezone)
      
      // Change date format
      await ownerPage.selectOption('select#dateFormat', testData.settings.general.dateFormat)
      
      // Save changes
      await ownerPage.click('button:has-text("Save Preferences")')
      
      // Should show success message
      await expect(ownerPage.locator('text=Settings saved successfully')).toBeVisible()
    })

    test('should validate tenant slug format', async ({ ownerPage }) => {
      await ownerPage.fill('input#slug', 'Invalid Slug!')
      
      // Should show validation error
      await expect(ownerPage.locator('text=Lowercase letters, numbers, and hyphens only')).toBeVisible()
    })
  })

  test.describe('Branding Settings', () => {
    test.beforeEach(async ({ ownerPage }) => {
      await ownerPage.goto('/dashboard/settings')
      await ownerPage.click('button:has-text("🎨 Branding")')
    })

    test('should display color pickers', async ({ ownerPage }) => {
      await expect(ownerPage.locator('label:has-text("Primary Colour")')).toBeVisible()
      await expect(ownerPage.locator('input[type="color"]#primaryColor')).toBeVisible()
      
      await expect(ownerPage.locator('label:has-text("Secondary Colour")')).toBeVisible()
      await expect(ownerPage.locator('input[type="color"]#secondaryColor')).toBeVisible()
    })

    test('should update branding colors', async ({ ownerPage }) => {
      // Change primary color
      await ownerPage.fill('input[type="text"][value*="#"]', testData.settings.branding.primaryColor)
      
      // Save changes
      await ownerPage.click('button:has-text("Save Branding")')
      
      // Should show success
      await expect(ownerPage.locator('text=Settings saved successfully')).toBeVisible()
    })

    test('should validate color format', async ({ ownerPage }) => {
      // Enter invalid color
      await ownerPage.fill('input[type="text"][value*="#"]', 'not-a-color')
      
      // Should show validation error on blur or submit
      await ownerPage.click('button:has-text("Save Branding")')
      await expect(ownerPage.locator('text=valid color')).toBeVisible()
    })
  })

  test.describe('Feature Settings', () => {
    test.beforeEach(async ({ ownerPage }) => {
      await ownerPage.goto('/dashboard/settings')
      await ownerPage.click('button:has-text("🚀 Features")')
    })

    test('should display feature toggles grouped by plan', async ({ ownerPage }) => {
      await expect(ownerPage.locator('h4:has-text("Starter Features")')).toBeVisible()
      await expect(ownerPage.locator('h4:has-text("Pro Features")')).toBeVisible()
      await expect(ownerPage.locator('h4:has-text("Enterprise Features")')).toBeVisible()
    })

    test('should toggle features', async ({ ownerPage }) => {
      // Find a feature toggle
      const invitationsToggle = ownerPage.locator('input[type="checkbox"]').filter({ 
        has: ownerPage.locator('text=Team Invitations') 
      })
      
      // Toggle it
      const isChecked = await invitationsToggle.isChecked()
      await invitationsToggle.click()
      
      // Save
      await ownerPage.click('button:has-text("Save Features")')
      
      // Should show success
      await expect(ownerPage.locator('text=Settings saved successfully')).toBeVisible()
    })

    test('should show plan restrictions for trial accounts', async ({ ownerPage }) => {
      // Should show trial limitations message
      await expect(ownerPage.locator('text=Trial Limitations')).toBeVisible()
    })

    test('should disable unavailable features', async ({ ownerPage }) => {
      // Enterprise features should be disabled on trial
      const ssoToggle = ownerPage.locator('input[type="checkbox"]').filter({ 
        has: ownerPage.locator('text=Single Sign-On') 
      })
      
      await expect(ssoToggle).toBeDisabled()
    })
  })

  test.describe('Security Settings', () => {
    test.beforeEach(async ({ ownerPage }) => {
      await ownerPage.goto('/dashboard/settings')
      await ownerPage.click('button:has-text("🔒 Security")')
    })

    test('should allow owners to modify security settings', async ({ ownerPage }) => {
      // Change minimum password length
      await ownerPage.fill('input#minLength', '12')
      
      // Toggle password requirements
      await ownerPage.check('input[type="checkbox"]:has-text("Require special characters")')
      
      // Save
      await ownerPage.click('button:has-text("Save Security Settings")')
      
      await expect(ownerPage.locator('text=Settings saved successfully')).toBeVisible()
    })

    test('should show read-only message for admins', async ({ adminPage }) => {
      await adminPage.goto('/dashboard/settings')
      await adminPage.click('button:has-text("🔒 Security")')
      
      await expect(adminPage.locator('text=Only tenant owners can modify security settings')).toBeVisible()
    })

    test('should validate session timeout range', async ({ ownerPage }) => {
      // Try value below minimum
      await ownerPage.fill('input#sessionTimeout', '2')
      await ownerPage.click('button:has-text("Save Security Settings")')
      
      // Should show validation error
      await expect(ownerPage.locator('text=Minimum 5 minutes')).toBeVisible()
    })
  })

  test.describe('Save Functionality', () => {
    test.beforeEach(async ({ ownerPage }) => {
      await ownerPage.goto('/dashboard/settings')
    })

    test('should save settings and show success message', async ({ ownerPage }) => {
      // Make a change
      await ownerPage.selectOption('select#timezone', 'America/Chicago')
      
      // Save
      await ownerPage.click('button:has-text("Save Preferences")')
      
      // Should show success message
      await expect(ownerPage.locator('text=Settings saved successfully')).toBeVisible()
      
      // Message should disappear after a few seconds
      await ownerPage.waitForTimeout(4000)
      await expect(ownerPage.locator('text=Settings saved successfully')).not.toBeVisible()
    })

    test('should show error message on save failure', async ({ ownerPage }) => {
      // This would require mocking the API to return an error
      // For now, we'll skip this
      test.skip()
    })

    test('should disable save button while saving', async ({ ownerPage }) => {
      // Make a change
      await ownerPage.selectOption('select#timezone', 'Europe/London')
      
      // Click save
      const saveButton = ownerPage.locator('button:has-text("Save Preferences")')
      await saveButton.click()
      
      // Button should be disabled during save
      await expect(saveButton).toBeDisabled()
      
      // Should re-enable after save
      await expect(saveButton).toBeEnabled()
    })
  })
})