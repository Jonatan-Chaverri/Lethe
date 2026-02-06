export const SIGNATURE_DOMAIN = {
    name: 'Lethe',
    version: '1',
    chainId: process.env.NEXT_PUBLIC_STARKNET_NETWORK === 'mainnet' ? 'SN_MAIN' : 'SN_SEPOLIA',
  }
  
  export const SIGNATURE_TYPES = {
    StarkNetDomain: [
      { name: 'name', type: 'felt' },
      { name: 'version', type: 'felt' },
      { name: 'chainId', type: 'felt' },
    ],
    Message: [
      { name: 'nonce', type: 'felt' },
    ],
  }
  
  export const SIGNATURE_PRIMARY_TYPE = 'Message'
  