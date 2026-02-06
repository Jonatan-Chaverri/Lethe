'use client'

import { useState, useEffect, useCallback } from 'react'
import { connect, disconnect, getSelectedConnectorWallet } from 'starknetkit'
import { constants } from 'starknet'
import { ArgentMobileConnector, isInArgentMobileAppBrowser } from 'starknetkit/argentMobile'
import { BraavosMobileConnector } from 'starknetkit/braavosMobile'
import type { StarknetWindowObject } from 'starknetkit'
import { buildSignatureTypedData } from '@/utils/signature'
import { InjectedConnector } from 'starknetkit/injected'
import { isMobile } from '@/utils/platform'
import { useAuthSession } from '@/providers/AuthProvider'
import type { RegisterWalletPayload } from '@/lib/api/auth'

export function useWalletLogin() {
  const { isAuthenticated, registerWalletSession, logout, isBootstrapping } = useAuthSession()
  const [wallet, setWallet] = useState<StarknetWindowObject | null>(null)
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Detect previously selected wallet
  useEffect(() => {
    const selected = getSelectedConnectorWallet()
    if (!selected){
      return
    }

    setWallet(selected)

    selected
      .request({ type: 'wallet_requestAccounts' })
      .then((accs: string[]) => {
        const addr = accs?.[0]
        if (!addr) {
          console.error("No address found")
          return
        }
        setAddress(addr)

        if (isAuthenticated) {
          setIsRegistered(true)
        } else {
          setIsRegistered(false)
        }
      })
      .catch((err) => console.error(err))
  }, [isAuthenticated])

  useEffect(() => {
    if (isBootstrapping) return
    setIsRegistered(isAuthenticated)
  }, [isAuthenticated, isBootstrapping])

  const connectWalletWithoutSignature = async () => {
      const argentMobileOptions = {
        dappName: 'Lethe',
        chainId: process.env.NEXT_PUBLIC_STARKNET_NETWORK === 'mainnet' ? constants.NetworkName.SN_MAIN : constants.NetworkName.SN_SEPOLIA,
        description: 'Lethe',
        url: process.env.NEXT_PUBLIC_APP_URL + '/login',
      }

      const braavosMobileOptions = { name: 'Braavos'}
      const argentMobileConnector = ArgentMobileConnector.init(
        { options: argentMobileOptions, inAppBrowserOptions: {} }
      );
      const braavosMobileConnector = BraavosMobileConnector.init({ inAppBrowserOptions: braavosMobileOptions });

      let connectors = [];
      
      if (isInArgentMobileAppBrowser()) {
        // Argent app browser: one obvious choice
        connectors = [argentMobileConnector]
      } else if (isMobile()) {
        // Mobile browsers (Safari / Chrome)
        connectors = [
          braavosMobileConnector,
          argentMobileConnector,
        ]
      } else {
        // Desktop
        connectors = [
          new InjectedConnector({ options: { id: 'braavos', name: 'Braavos'} }),
          new InjectedConnector({ options: { id: 'argentX', name: 'Ready Wallet' } }),
          // leave this options here in case the user has no wallet installed in browser
          argentMobileConnector,
        ]
      }

      const result = await connect({
        connectors: connectors,
        dappName: 'Lethe',
        modalTheme: 'light',
        modalMode: 'alwaysAsk'
      })

      const walletAddress = result?.connectorData?.account
      if (!result.wallet || !walletAddress) {
        throw new Error('Connection cancelled')
      }

      return { wallet: result.wallet, connectorData: result.connectorData }
  }

  const connectWallet = useCallback(async () => {
    setIsConnecting(true)
    setError(null)

    try {
      const result = await connectWalletWithoutSignature()
      if (!result.wallet) {
        throw new Error('No wallet connected')
      }

      const walletAddress = result.connectorData?.account ?? ''

      // Typed data
      const typedData = buildSignatureTypedData()

      // Sign
      const rawSig: any = await result.wallet.request({
        type: 'wallet_signTypedData',
        params: typedData,
      })

      const rawSignature = Array.isArray(rawSig)
        ? rawSig
        : rawSig.signature ?? []

      if (!rawSignature.length || rawSignature.length < 2) {
        throw new Error('Invalid signature')
      }

      // Convert signature to hex strings with 0x prefix (required by backend)
      // Starknet signatures are felt252 values that need to be converted to hex
      const signature = rawSignature.map((sig: any) => {
        // If already a hex string with 0x prefix, normalize and return
        if (typeof sig === 'string' && sig.startsWith('0x')) {
          return sig.toLowerCase()
        }
        
        // Convert to BigInt (handles numbers, BigInt, decimal strings, and hex strings)
        try {
          const num = typeof sig === 'bigint' ? sig : BigInt(sig)
          // Convert BigInt to hex string with 0x prefix
          return '0x' + num.toString(16).toLowerCase()
        } catch (error) {
          // If conversion fails, return as string with 0x prefix
          const str = String(sig)
          return str.startsWith('0x') ? str.toLowerCase() : '0x' + str.toLowerCase()
        }
      })

      // Register with backend
      const payload: RegisterWalletPayload = {
        wallet: walletAddress,
        signature: [signature[0], signature[1]],
        nonce: typedData.message.nonce,
        wallet_provider: 'wallet',
      }
      await registerWalletSession(payload)
      setWallet(result.wallet)
      setAddress(walletAddress)
      setIsRegistered(true)
    } catch (err: any) {
      console.error("Wallet login failed", err)
      setError(err.message || 'Wallet login failed')
      await disconnect()
      setWallet(null)
      setAddress(null)
      setIsRegistered(false)
    } finally {
      setIsConnecting(false)
    }
  }, [registerWalletSession])

  const disconnectWallet = useCallback(async () => {
    await disconnect()
    logout()
    setWallet(null)
    setAddress(null)
    setIsRegistered(false)
  }, [logout])

  return {
    wallet,
    address,
    isRegistered,
    isConnecting,
    error,
    connectWalletWithoutSignature,
    connectWallet,
    disconnectWallet,
  }
}
