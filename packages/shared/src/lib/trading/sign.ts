import type { SignerFn } from './types'

/**
 * Create an HMAC-SHA256 signer using the Web Crypto API.
 * Works in Electron renderer, Capacitor WebView, and modern browsers.
 */
export function createWebCryptoSigner(secret: string): SignerFn {
  let cryptoKey: CryptoKey | null = null

  async function getKey(): Promise<CryptoKey> {
    if (cryptoKey) return cryptoKey
    const encoder = new TextEncoder()
    cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    )
    return cryptoKey
  }

  return async (queryString: string): Promise<string> => {
    const key = await getKey()
    const encoder = new TextEncoder()
    const signature = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(queryString),
    )
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
}
