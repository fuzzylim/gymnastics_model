import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server'
import type {
  GenerateRegistrationOptionsOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyRegistrationResponseOpts,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server'
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers'
import {
  getUserCredentials,
  createCredential,
  updateCredentialCounter,
  createChallenge,
  getValidChallenge,
  markChallengeAsUsed,
} from '@/lib/db/auth-utils'

// WebAuthn configuration
const rpName = process.env.RP_NAME || 'Gymnastics Model'
const rpID = process.env.RP_ID || 'localhost'
const origin = process.env.ORIGIN || 'http://localhost:3000'

export interface PasskeyRegistrationOptions {
  userId: string
  userEmail: string
  userName?: string
}

export interface PasskeyAuthenticationOptions {
  userId?: string
}

/**
 * Generate registration options for passkey creation
 */
export async function generatePasskeyRegistrationOptions({
  userId,
  userEmail,
  userName,
}: PasskeyRegistrationOptions) {
  // Get existing credentials to exclude them from registration
  const existingCredentials = await getUserCredentials(userId)
  
  const opts: GenerateRegistrationOptionsOpts = {
    rpName,
    rpID,
    userID: userId,
    userName: userEmail,
    userDisplayName: userName || userEmail,
    timeout: 60000,
    attestationType: 'none',
    excludeCredentials: existingCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.credentialId),
      type: 'public-key',
      transports: cred.transports ? JSON.parse(cred.transports as string) : undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
    supportedAlgorithmIDs: [-7, -257],
  }

  const options = await generateRegistrationOptions(opts)

  // Store challenge in database
  await createChallenge({
    challenge: options.challenge,
    userId,
    type: 'registration',
    expiresAt: new Date(Date.now() + 60000), // 1 minute
  })

  return options
}

/**
 * Verify passkey registration response
 */
export async function verifyPasskeyRegistration(
  userId: string,
  registrationResponse: any
) {
  // Get stored challenge
  const challengeRecord = await getValidChallenge(
    registrationResponse.response.clientDataJSON ? 
      JSON.parse(Buffer.from(registrationResponse.response.clientDataJSON, 'base64').toString()).challenge :
      registrationResponse.challenge,
    userId
  )

  if (!challengeRecord) {
    throw new Error('Invalid or expired challenge')
  }

  const opts: VerifyRegistrationResponseOpts = {
    response: registrationResponse,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  }

  const verification = await verifyRegistrationResponse(opts)

  if (verification.verified && verification.registrationInfo) {
    const { credentialID, credentialPublicKey, counter } = verification.registrationInfo

    // Save credential to database
    await createCredential({
      credentialId: isoBase64URL.fromBuffer(credentialID),
      userId,
      publicKey: Buffer.from(credentialPublicKey).toString('base64'),
      counter,
      transports: registrationResponse.response.transports ? 
        JSON.stringify(registrationResponse.response.transports) : null,
    })

    // Mark challenge as used
    await markChallengeAsUsed(challengeRecord.id)

    return { verified: true, credentialID: isoBase64URL.fromBuffer(credentialID) }
  }

  return { verified: false }
}

/**
 * Generate authentication options for passkey login
 */
export async function generatePasskeyAuthenticationOptions({
  userId,
}: PasskeyAuthenticationOptions = {}) {
  let allowCredentials: any[] = []

  if (userId) {
    // Get user's credentials for targeted authentication
    const userCredentials = await getUserCredentials(userId)
    allowCredentials = userCredentials.map(cred => ({
      id: isoBase64URL.toBuffer(cred.credentialId),
      type: 'public-key',
      transports: cred.transports ? JSON.parse(cred.transports as string) : undefined,
    }))
  }

  const opts: GenerateAuthenticationOptionsOpts = {
    timeout: 60000,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: 'preferred',
    rpID,
  }

  const options = await generateAuthenticationOptions(opts)

  // Store challenge in database
  await createChallenge({
    challenge: options.challenge,
    userId: userId || null,
    type: 'authentication',
    expiresAt: new Date(Date.now() + 60000), // 1 minute
  })

  return options
}

/**
 * Verify passkey authentication response
 */
export async function verifyPasskeyAuthentication(
  authenticationResponse: any,
  expectedUserId?: string
) {
  // Get stored challenge
  const challengeRecord = await getValidChallenge(
    authenticationResponse.response.clientDataJSON ?
      JSON.parse(Buffer.from(authenticationResponse.response.clientDataJSON, 'base64').toString()).challenge :
      authenticationResponse.challenge,
    expectedUserId
  )

  if (!challengeRecord) {
    throw new Error('Invalid or expired challenge')
  }

  // Get credential from database
  const credentialId = isoBase64URL.fromBuffer(authenticationResponse.rawId)
  const credential = await getUserCredentials(challengeRecord.userId || '')
    .then(creds => creds.find(c => c.credentialId === credentialId))

  if (!credential) {
    throw new Error('Credential not found')
  }

  const opts: VerifyAuthenticationResponseOpts = {
    response: authenticationResponse,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator: {
      credentialID: isoBase64URL.toBuffer(credential.credentialId),
      credentialPublicKey: Buffer.from(credential.publicKey, 'base64'),
      counter: credential.counter,
      transports: credential.transports ? JSON.parse(credential.transports as string) : undefined,
    },
  }

  const verification = await verifyAuthenticationResponse(opts)

  if (verification.verified) {
    // Update counter
    await updateCredentialCounter(credential.credentialId, verification.authenticationInfo.newCounter)
    
    // Mark challenge as used
    await markChallengeAsUsed(challengeRecord.id)

    return { verified: true, userId: credential.userId }
  }

  return { verified: false }
}