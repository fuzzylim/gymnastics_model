# Passkeys Implementation Guide

## Overview

This guide provides implementation details for adding passkeys (WebAuthn) authentication to the application.

## Libraries

### SimpleWebAuthn
```bash
npm install @simplewebauthn/server @simplewebauthn/browser
```

### Database Schema

```sql
-- Store user credentials
CREATE TABLE credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  transports TEXT[],
  created_at TIMESTAMP DEFAULT NOW()
);

-- Store challenges for replay protection  
CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL,
  user_id UUID,
  expires_at TIMESTAMP NOT NULL,
  used BOOLEAN DEFAULT FALSE
);
```

## Registration Flow

### 1. Generate Registration Options

```typescript
import { generateRegistrationOptions } from '@simplewebauthn/server';

export async function createRegistrationOptions(userId: string) {
  const user = await getUser(userId);
  const userCredentials = await getUserCredentials(userId);
  
  const options = await generateRegistrationOptions({
    rpName: 'Your App Name',
    rpID: 'yourapp.com',
    userID: userId,
    userName: user.email,
    userDisplayName: user.name || user.email,
    attestationType: 'none',
    excludeCredentials: userCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports,
    })),
    authenticatorSelection: {
      residentKey: 'required',
      userVerification: 'preferred',
    },
  });
  
  // Store challenge for verification
  await storeChallenge(userId, options.challenge);
  
  return options;
}
```

### 2. Client-Side Registration

```typescript
import { startRegistration } from '@simplewebauthn/browser';

async function registerPasskey() {
  // Get options from server
  const options = await fetch('/api/auth/register/options').then(r => r.json());
  
  try {
    // Start WebAuthn registration
    const credential = await startRegistration(options);
    
    // Send to server for verification
    const verified = await fetch('/api/auth/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential),
    }).then(r => r.json());
    
    if (verified.success) {
      console.log('Passkey registered successfully!');
    }
  } catch (error) {
    console.error('Registration failed:', error);
  }
}
```

### 3. Verify Registration

```typescript
import { verifyRegistrationResponse } from '@simplewebauthn/server';

export async function verifyRegistration(
  userId: string,
  credential: RegistrationResponseJSON
) {
  const challenge = await getStoredChallenge(userId);
  
  const verification = await verifyRegistrationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: 'https://yourapp.com',
    expectedRPID: 'yourapp.com',
  });
  
  if (verification.verified && verification.registrationInfo) {
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;
    
    // Store credential in database
    await storeCredential({
      userId,
      credentialId: Buffer.from(credentialID).toString('base64'),
      publicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      transports: credential.response.transports,
    });
    
    return { success: true };
  }
  
  return { success: false };
}
```

## Authentication Flow

### 1. Generate Authentication Options

```typescript
import { generateAuthenticationOptions } from '@simplewebauthn/server';

export async function createAuthenticationOptions(email?: string) {
  const allowCredentials = email
    ? await getUserCredentialsByEmail(email)
    : [];
  
  const options = await generateAuthenticationOptions({
    rpID: 'yourapp.com',
    userVerification: 'preferred',
    allowCredentials: allowCredentials.map(cred => ({
      id: cred.credentialId,
      type: 'public-key',
      transports: cred.transports,
    })),
  });
  
  // Store challenge
  await storeChallenge(null, options.challenge);
  
  return options;
}
```

### 2. Client-Side Authentication

```typescript
import { startAuthentication } from '@simplewebauthn/browser';

async function loginWithPasskey() {
  const options = await fetch('/api/auth/login/options').then(r => r.json());
  
  try {
    const credential = await startAuthentication(options);
    
    const result = await fetch('/api/auth/login/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credential),
    }).then(r => r.json());
    
    if (result.success) {
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('Authentication failed:', error);
  }
}
```

### 3. Verify Authentication

```typescript
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

export async function verifyAuthentication(
  credential: AuthenticationResponseJSON
) {
  const storedCredential = await getCredentialById(credential.id);
  if (!storedCredential) {
    return { success: false };
  }
  
  const challenge = await getStoredChallenge();
  
  const verification = await verifyAuthenticationResponse({
    response: credential,
    expectedChallenge: challenge,
    expectedOrigin: 'https://yourapp.com',
    expectedRPID: 'yourapp.com',
    authenticator: {
      credentialID: Buffer.from(storedCredential.credentialId, 'base64'),
      credentialPublicKey: Buffer.from(storedCredential.publicKey, 'base64'),
      counter: storedCredential.counter,
    },
  });
  
  if (verification.verified) {
    // Update counter
    await updateCredentialCounter(
      credential.id,
      verification.authenticationInfo.newCounter
    );
    
    // Create session
    const session = await createSession(storedCredential.userId);
    
    return { success: true, session };
  }
  
  return { success: false };
}
```

## NextAuth Integration

```typescript
// app/api/auth/[...nextauth]/route.ts
import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

export const authOptions = {
  providers: [
    CredentialsProvider({
      id: 'passkey',
      name: 'Passkey',
      credentials: {},
      async authorise(credentials: any) {
        // Verify passkey authentication
        const result = await verifyAuthentication(credentials);
        
        if (result.success) {
          return {
            id: result.userId,
            email: result.email,
            tenantId: result.tenantId,
          };
        }
        
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
      }
      return token;
    },
    async session({ session, token }) {
      session.tenantId = token.tenantId;
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

## Browser Support

### Feature Detection

```typescript
function isPasskeySupported() {
  return !!(
    window.PublicKeyCredential &&
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
  );
}

async function checkPasskeySupport() {
  if (!isPasskeySupported()) {
    return { supported: false, reason: 'WebAuthn not supported' };
  }
  
  const available = await PublicKeyCredential
    .isUserVerifyingPlatformAuthenticatorAvailable();
    
  return {
    supported: available,
    reason: available ? null : 'No platform authenticator available',
  };
}
```

### Fallback Strategy

```typescript
export function AuthForm() {
  const [passkeySupported, setPasskeySupported] = useState(false);
  
  useEffect(() => {
    checkPasskeySupport().then(result => {
      setPasskeySupported(result.supported);
    });
  }, []);
  
  if (!passkeySupported) {
    return <MagicLinkForm />;
  }
  
  return <PasskeyForm />;
}
```

## Security Considerations

1. **Always verify origin and RP ID**
2. **Use secure random for challenges**
3. **Implement challenge expiration (5 minutes)**
4. **Store only public keys**
5. **Validate counter to prevent cloning**
6. **Use HTTPS in production**
7. **Implement rate limiting**

## Testing

### Manual Testing Checklist
- [ ] Registration on Chrome/Edge/Safari
- [ ] Authentication on Chrome/Edge/Safari  
- [ ] Multiple credentials per user
- [ ] Cross-platform sync (iOS ↔ Mac)
- [ ] Fallback to magic link
- [ ] Error handling

### Automated Testing

```typescript
import { describe, it, expect } from 'vitest';
import { generateRegistrationOptions } from '@simplewebauthn/server';

describe('Passkey Registration', () => {
  it('generates valid registration options', async () => {
    const options = await createRegistrationOptions('user-123');
    
    expect(options.challenge).toBeDefined();
    expect(options.rp.id).toBe('yourapp.com');
    expect(options.user.id).toBe('user-123');
  });
});
```

## Common Issues

### "Authenticator not allowed"
- Ensure `authenticatorSelection` matches your requirements
- Check if platform authenticator is available

### "Invalid origin"
- Verify `expectedOrigin` matches your domain
- Check for www vs non-www

### "User verification required"
- Set `userVerification: 'preferred'` instead of 'required'
- Some devices don't support user verification

## Resources

- [WebAuthn Guide](https://webauthn.guide/)
- [SimpleWebAuthn Docs](https://simplewebauthn.dev/)
- [Passkeys.dev](https://passkeys.dev/)
- [FIDO Alliance](https://fidoalliance.org/)