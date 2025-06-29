// Test setup file
import '@testing-library/jest-dom'

// Mock environment variables
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test'
process.env.AUTH_URL = process.env.AUTH_URL || 'http://localhost:3000'
process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret'