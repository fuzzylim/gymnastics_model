import { test, expect, type Page } from '@playwright/test'

// Mock WebAuthn API for testing
async function mockWebAuthnAPI(page: Page) {
  await page.addInitScript(() => {
    // Mock PublicKeyCredential for WebAuthn support detection
    Object.defineProperty(window, 'PublicKeyCredential', {
      value: class MockPublicKeyCredential {
        static isUserVerifyingPlatformAuthenticatorAvailable() {
          return Promise.resolve(true)
        }
        static isConditionalMediationAvailable() {
          return Promise.resolve(true)
        }
      },
      writable: true
    })

    // Mock navigator.credentials.create for registration
    const originalCreate = navigator.credentials.create
    navigator.credentials.create = async (options) => {
      if (options?.publicKey) {
        // Return mock registration response
        return {
          id: 'mock-credential-id',
          rawId: new TextEncoder().encode('mock-credential-id'),
          type: 'public-key',
          response: {
            clientDataJSON: new TextEncoder().encode(JSON.stringify({
              type: 'webauthn.create',
              challenge: 'mock-challenge',
              origin: window.location.origin
            })),
            attestationObject: new TextEncoder().encode('mock-attestation'),
            getTransports: () => ['internal']
          },
          getClientExtensionResults: () => ({})
        }
      }
      return originalCreate?.call(navigator.credentials, options)
    }

    // Mock navigator.credentials.get for authentication
    const originalGet = navigator.credentials.get
    navigator.credentials.get = async (options) => {
      if (options?.publicKey) {
        // Return mock authentication response
        return {
          id: 'mock-credential-id',
          rawId: new TextEncoder().encode('mock-credential-id'),
          type: 'public-key',
          response: {
            clientDataJSON: new TextEncoder().encode(JSON.stringify({
              type: 'webauthn.get',
              challenge: 'mock-challenge',
              origin: window.location.origin
            })),
            authenticatorData: new TextEncoder().encode('mock-auth-data'),
            signature: new TextEncoder().encode('mock-signature'),
            userHandle: null
          },
          getClientExtensionResults: () => ({})
        }
      }
      return originalGet?.call(navigator.credentials, options)
    }
  })
}

test.describe('Passkey Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    await mockWebAuthnAPI(page)
  })

  test('should complete registration flow with passkey', async ({ page }) => {
    // Navigate to registration page
    await page.goto('/register')

    // Verify page loads correctly
    await expect(page.locator('h2')).toContainText('Create your account')

    // Fill in registration form
    await page.fill('input[name="email"]', 'e2e-test@example.com')
    await page.fill('input[name="name"]', 'E2E Test User')

    // Mock the API responses for registration
    await page.route('/api/auth/passkey/register/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challenge: 'mock-challenge',
          rp: { name: 'Test App', id: 'localhost' },
          user: { 
            id: 'mock-user-id', 
            name: 'e2e-test@example.com', 
            displayName: 'E2E Test User' 
          },
          pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
          timeout: 60000,
          attestation: 'none'
        })
      })
    })

    await page.route('/api/auth/passkey/register/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verified: true,
          credentialID: 'mock-credential-id'
        })
      })
    })

    // Click register with passkey button
    await page.click('button:has-text("Register with Passkey")')

    // Wait for success state or redirect
    await page.waitForURL('**/login*', { timeout: 10000 })

    // Verify redirect to login page
    await expect(page.locator('h2')).toContainText('Sign in to your account')
  })

  test('should complete authentication flow with passkey', async ({ page }) => {
    // Navigate to login page
    await page.goto('/login')

    // Verify page loads correctly
    await expect(page.locator('h2')).toContainText('Sign in to your account')

    // Mock the API responses for authentication
    await page.route('/api/auth/passkey/authenticate/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challenge: 'mock-challenge',
          timeout: 60000,
          rpId: 'localhost'
        })
      })
    })

    await page.route('/api/auth/passkey/authenticate/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verified: true,
          user: {
            id: 'mock-user-id',
            email: 'e2e-test@example.com',
            name: 'E2E Test User'
          },
          message: 'Authentication successful'
        })
      })
    })

    // Click sign in with passkey button
    await page.click('button:has-text("Sign in with Passkey")')

    // Wait for successful authentication and redirect
    await page.waitForURL('**/dashboard*', { timeout: 10000 })

    // Verify redirect to dashboard
    await expect(page.url()).toContain('/dashboard')
  })

  test('should handle targeted authentication with email', async ({ page }) => {
    await page.goto('/login')

    // Fill in email for targeted authentication
    await page.fill('input[placeholder*="Email address"]', 'targeted-test@example.com')

    // Mock API responses with email parameter
    await page.route('/api/auth/passkey/authenticate/options', async (route) => {
      const request = route.request()
      const postData = JSON.parse(request.postData() || '{}')
      
      // Verify email is sent in request
      expect(postData.email).toBe('targeted-test@example.com')
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challenge: 'mock-targeted-challenge',
          timeout: 60000,
          rpId: 'localhost',
          allowCredentials: [{
            id: 'target-credential-id',
            type: 'public-key',
            transports: ['internal']
          }]
        })
      })
    })

    await page.route('/api/auth/passkey/authenticate/verify', async (route) => {
      const request = route.request()
      const postData = JSON.parse(request.postData() || '{}')
      
      // Verify email is sent in verification
      expect(postData.email).toBe('targeted-test@example.com')
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          verified: true,
          user: {
            id: 'target-user-id',
            email: 'targeted-test@example.com',
            name: 'Targeted User'
          }
        })
      })
    })

    await page.click('button:has-text("Sign in with Passkey")')
    await page.waitForURL('**/dashboard*', { timeout: 10000 })
  })

  test('should show magic link option when passkeys not supported', async ({ page }) => {
    // Override WebAuthn support to false
    await page.addInitScript(() => {
      Object.defineProperty(window, 'PublicKeyCredential', {
        value: undefined,
        writable: true
      })
    })

    await page.goto('/login')

    // Should not show passkey button
    await expect(page.locator('button:has-text("Sign in with Passkey")')).toBeHidden()

    // Should show warning message
    await expect(page.locator('text=Your device doesn\'t support passkeys')).toBeVisible()

    // Magic link button should still be available
    await expect(page.locator('button:has-text("Send Magic Link")')).toBeVisible()
  })

  test('should handle authentication errors gracefully', async ({ page }) => {
    await page.goto('/login')

    // Mock failed authentication
    await page.route('/api/auth/passkey/authenticate/options', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Failed to generate options' })
      })
    })

    await page.click('button:has-text("Sign in with Passkey")')

    // Should show error message
    await expect(page.locator('text=Failed to get authentication options')).toBeVisible()

    // Should remain on login page
    await expect(page.url()).toContain('/login')
  })

  test('should handle registration errors gracefully', async ({ page }) => {
    await page.goto('/register')

    await page.fill('input[name="email"]', 'error-test@example.com')
    await page.fill('input[name="name"]', 'Error Test User')

    // Mock failed registration
    await page.route('/api/auth/passkey/register/options', async (route) => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email is required' })
      })
    })

    await page.click('button:has-text("Register with Passkey")')

    // Should show error message
    await expect(page.locator('text=Email is required')).toBeVisible()

    // Should remain on register page
    await expect(page.url()).toContain('/register')
  })

  test('should handle user cancellation of WebAuthn prompt', async ({ page }) => {
    await page.goto('/login')

    // Mock user cancellation
    await page.addInitScript(() => {
      const originalGet = navigator.credentials.get
      navigator.credentials.get = async (options) => {
        if (options?.publicKey) {
          throw new DOMException('User cancelled', 'NotAllowedError')
        }
        return originalGet?.call(navigator.credentials, options)
      }
    })

    await page.route('/api/auth/passkey/authenticate/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challenge: 'mock-challenge',
          timeout: 60000,
          rpId: 'localhost'
        })
      })
    })

    await page.click('button:has-text("Sign in with Passkey")')

    // Should show cancellation error
    await expect(page.locator('text=User cancelled')).toBeVisible()

    // Should remain on login page
    await expect(page.url()).toContain('/login')
  })

  test('should maintain session after successful authentication', async ({ page, context }) => {
    await page.goto('/login')

    // Mock successful authentication that sets session cookie
    await page.route('/api/auth/passkey/authenticate/verify', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Set-Cookie': 'authjs.session-token=mock-session-token; HttpOnly; Secure; SameSite=Lax; Path=/'
        },
        body: JSON.stringify({
          verified: true,
          user: {
            id: 'session-user-id',
            email: 'session-test@example.com',
            name: 'Session User'
          }
        })
      })
    })

    await page.route('/api/auth/passkey/authenticate/options', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          challenge: 'mock-challenge',
          timeout: 60000,
          rpId: 'localhost'
        })
      })
    })

    // Mock auth session check
    await page.route('/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'session-user-id',
            email: 'session-test@example.com',
            name: 'Session User'
          }
        })
      })
    })

    await page.click('button:has-text("Sign in with Passkey")')
    await page.waitForURL('**/dashboard*', { timeout: 10000 })

    // Navigate to a new page and verify session is maintained
    await page.goto('/dashboard')
    
    // Should not redirect to login
    await expect(page.url()).toContain('/dashboard')
    
    // Verify session cookie exists
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(cookie => cookie.name === 'authjs.session-token')
    expect(sessionCookie).toBeDefined()
  })

  test('should prevent access to protected routes without authentication', async ({ page }) => {
    // Attempt to access dashboard without authentication
    await page.goto('/dashboard')

    // Should redirect to login
    await page.waitForURL('**/login*', { timeout: 5000 })
    await expect(page.url()).toContain('/login')
  })
})