import {
    SIGNATURE_DOMAIN,
    SIGNATURE_TYPES,
    SIGNATURE_PRIMARY_TYPE
  } from '@/types/signature'
  
export function buildSignatureTypedData() {
    const random = BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER))
    const nonce = '0x' + (BigInt(Date.now()) + random).toString(16)
  
    return {
      domain: SIGNATURE_DOMAIN,
      types: SIGNATURE_TYPES,
      primaryType: SIGNATURE_PRIMARY_TYPE,
      message: { nonce },
    }
  }
  
