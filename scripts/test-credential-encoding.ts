import { isoBase64URL } from '@simplewebauthn/server/helpers'

const credentialId = '_0wHYM_pkbO6Jydaq9EiMYnj54SUi1-16CZiRlwbd1M'

console.log('Original credential ID:', credentialId)

// Convert to buffer and back
const buffer = isoBase64URL.toBuffer(credentialId)
const backToString = isoBase64URL.fromBuffer(buffer)

console.log('Buffer:', buffer)
console.log('Back to string:', backToString)
console.log('Match:', credentialId === backToString)