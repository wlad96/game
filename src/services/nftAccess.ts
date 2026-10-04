import { NFT_COLLECTIONS, PORTALS } from '../data/cities';
import type { CityId } from '../data/types';

/**
 * NFT access (TZ §7). In production the backend reads the wallet's holdings
 * (e.g. a Supabase edge function calling an indexer) and returns the owned
 * collection ids. For the MVP we connect to an injected wallet if present
 * and use a demo switch to simulate holdings.
 */

export type CityAccess = 'full' | 'visitor' | 'locked';

const DEMO_KEY = 'sai-demo-nfts';

interface Eip1193 {
  request(args: { method: string }): Promise<unknown>;
}

export async function connectWallet(): Promise<string> {
  const eth = (window as unknown as { ethereum?: Eip1193 }).ethereum;
  if (eth) {
    try {
      const accounts = (await eth.request({ method: 'eth_requestAccounts' })) as string[];
      if (accounts?.[0]) return accounts[0];
    } catch {
      // user rejected — fall through to demo wallet
    }
  }
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(20)), (b) => b.toString(16).padStart(2, '0')).join('');
  return `0x${hex}`;
}

/** Mock of `GET /api/wallets/:address/nfts`. */
export async function fetchOwnedCollections(_address: string): Promise<string[]> {
  await new Promise((r) => setTimeout(r, 450));
  try {
    return JSON.parse(localStorage.getItem(DEMO_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

export function setDemoCollections(ids: string[]) {
  try {
    localStorage.setItem(DEMO_KEY, JSON.stringify(ids));
  } catch {
    // storage unavailable
  }
}

export function ownedCities(collections: string[]): CityId[] {
  return collections.map((c) => NFT_COLLECTIONS[c]).filter(Boolean);
}

/** No hard lock: visitors still get the city, NFT unlocks the full experience. */
export function cityAccess(city: CityId, collections: string[]): CityAccess {
  const portal = PORTALS.find((p) => p.city === city);
  if (!portal) return 'locked';
  if (!portal.requiresNFT || ownedCities(collections).includes(city)) return 'full';
  return portal.visitorAccess ? 'visitor' : 'locked';
}

export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
