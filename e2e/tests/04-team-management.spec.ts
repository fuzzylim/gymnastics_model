import { test, expect } from '../fixtures/auth.fixture'

test.describe('Phase 4: Team Management', () => {
  test.beforeEach(async ({ ownerPage }) => {
    // Navigate to team page
    await ownerPage.goto('/dashboard/team')
  })

  test('should display team members list', async ({ ownerPage }) => {
    await expect(ownerPage.locator('h1:has-text("Team Members")')).toBeVisible()
    
    // Should show table headers
    await expect(ownerPage.locator('th:has-text("Member")')).toBeVisible()
    await expect(ownerPage.locator('th:has-text("Role")')).toBeVisible()
    await expect(ownerPage.locator('th:has-text("Status")')).toBeVisible()
    await expect(ownerPage.locator('th:has-text("Joined")')).toBeVisible()
  })

  test('should show invite button for admins', async ({ ownerPage }) => {
    await expect(ownerPage.locator('button:has-text("Invite Member")')).toBeVisible()
  })

  test('should not show invite button for members', async ({ memberPage }) => {
    await memberPage.goto('/dashboard/team')
    await expect(memberPage.locator('button:has-text("Invite Member")')).not.toBeVisible()
  })

  test('should open invite member dialog', async ({ ownerPage }) => {
    await ownerPage.click('button:has-text("Invite Member")')
    
    // Dialog should appear
    await expect(ownerPage.locator('h2:has-text("Invite Team Member")')).toBeVisible()
    
    // Should have form fields
    await expect(ownerPage.locator('label:has-text("Email Address")')).toBeVisible()
    await expect(ownerPage.locator('label:has-text("Role")')).toBeVisible()
  })

  test('should send team invitation', async ({ ownerPage }) => {
    await ownerPage.click('button:has-text("Invite Member")')
    
    // Fill invitation form
    await ownerPage.fill('input[type="email"]', 'newmember@example.com')
    await ownerPage.selectOption('select#role', 'member')
    
    // Send invitation
    await ownerPage.click('button:has-text("Send Invitation")')
    
    // Should show success message
    await expect(ownerPage.locator('text=Invitation sent')).toBeVisible()
  })

  test('should validate invitation email', async ({ ownerPage }) => {
    await ownerPage.click('button:has-text("Invite Member")')
    
    // Try invalid email
    await ownerPage.fill('input[type="email"]', 'invalid-email')
    await ownerPage.click('button:has-text("Send Invitation")')
    
    // Should show error
    await expect(ownerPage.locator('text=valid email')).toBeVisible()
  })

  test('should show role change option for existing members', async ({ ownerPage }) => {
    // Assuming there are existing members
    const memberRow = ownerPage.locator('tr').filter({ hasText: '@example.com' }).first()
    
    if (await memberRow.isVisible()) {
      await expect(memberRow.locator('button:has-text("Change Role")')).toBeVisible()
    }
  })

  test('should allow changing member role', async ({ ownerPage }) => {
    const memberRow = ownerPage.locator('tr').filter({ hasText: '@example.com' }).first()
    
    if (await memberRow.isVisible()) {
      await memberRow.locator('button:has-text("Change Role")').click()
      
      // Dialog should appear
      await expect(ownerPage.locator('h2:has-text("Change Member Role")')).toBeVisible()
      
      // Select new role
      await ownerPage.selectOption('select#role', 'admin')
      await ownerPage.click('button:has-text("Update Role")')
      
      // Should show success
      await expect(ownerPage.locator('text=updated successfully')).toBeVisible()
    }
  })

  test('should show remove member option', async ({ ownerPage }) => {
    const memberRow = ownerPage.locator('tr').filter({ hasText: '@example.com' }).first()
    
    if (await memberRow.isVisible()) {
      await expect(memberRow.locator('button:has-text("Remove")')).toBeVisible()
    }
  })

  test('should confirm before removing member', async ({ ownerPage }) => {
    const memberRow = ownerPage.locator('tr').filter({ hasText: '@example.com' }).first()
    
    if (await memberRow.isVisible()) {
      await memberRow.locator('button:has-text("Remove")').click()
      
      // Confirmation dialog should appear
      await expect(ownerPage.locator('h2:has-text("Remove Team Member")')).toBeVisible()
      await expect(ownerPage.locator('text=This action cannot be undone')).toBeVisible()
      
      // Should have cancel and confirm buttons
      await expect(ownerPage.locator('button:has-text("Cancel")')).toBeVisible()
      await expect(ownerPage.locator('button:has-text("Remove Member")')).toBeVisible()
    }
  })

  test('should prevent removing last owner', async ({ ownerPage }) => {
    // This test would need to identify the owner row
    // and verify that removing them shows an error
    test.skip()
  })
})