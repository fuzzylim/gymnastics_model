/**
 * Admin utilities for checking system administrator permissions
 */

// List of system admin emails - in production, this could come from environment variables
// or a dedicated admin configuration system
const SYSTEM_ADMIN_EMAILS = [
  // Add system admin emails here
  // Example: 'admin@example.com',
  
  // For development, you can add your email here temporarily
  process.env.SYSTEM_ADMIN_EMAIL,
].filter(Boolean) as string[]

/**
 * Check if a user email has system administrator privileges
 */
export function isSystemAdmin(email: string): boolean {
  return SYSTEM_ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * Check if a user object has system administrator privileges
 */
export function isUserSystemAdmin(user: { email: string } | null | undefined): boolean {
  if (!user?.email) return false
  return isSystemAdmin(user.email)
}

/**
 * Get all system admin emails (for debugging/admin purposes)
 */
export function getSystemAdminEmails(): string[] {
  return [...SYSTEM_ADMIN_EMAILS]
}

/**
 * Add a system admin email at runtime (for development)
 * In production, this should be done through proper configuration
 */
export function addSystemAdmin(email: string): void {
  if (!isSystemAdmin(email)) {
    SYSTEM_ADMIN_EMAILS.push(email.toLowerCase())
  }
}