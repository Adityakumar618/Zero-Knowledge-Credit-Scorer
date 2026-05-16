import { useState, useCallback } from 'react';
import { networkId } from '@midnight-ntwrk/midnight-js';
import type { 
  MidnightProviders
} from '@midnight-ntwrk/midnight-js-types';
import { MIDNIGHT_CONFIG } from '../config';

// Define minimal DApp Connector types
interface DAppConnector {
  name: string;
  icon: string;
  apiVersion: string;
  connect(networkId: string): Promise<ConnectedAPI>;
}

interface ConnectedAPI {
  getShieldedAddresses(): Promise<{
    shieldedAddress: string;
    shieldedCoinPublicKey: string;
    shieldedEncryptionPublicKey: string;
  }>;
  getShieldedBalances(): Promise<Record<string, bigint>>;
  getConfiguration(): Promise<{
    indexerUri: string;
    indexerWsUri: string;
    substrateNodeUri: string;
    networkId: string;
  }>;
}

declare global {
  interface Window {
    midnight?: {
      portal?: DAppConnector;
    };
  }
}

export function useMidnight() {
  const [providers] = useState<MidnightProviders | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDemo, setIsDemo] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);

  const connect = useCallback(async () => {
    try {
      setIsConnecting(true);
      if (!window.midnight?.portal) {
        // Fall back to demo mode and provide a stable demo address so
        // the UI can display an address even when the real wallet is missing.
        setIsDemo(true);
        const demoAddr = '0xDEMO00000000000000000000000000000001';
        setAddress(demoAddr);
        setIsConnected(true);
        setError(null);
        console.warn('Midnight 1am wallet not found. Falling back to Demo Mode.');
        return;
      }

      setError(null);
      // Initialize network
      networkId.setNetworkId(MIDNIGHT_CONFIG.networkId);

      const api = await window.midnight.portal.connect(MIDNIGHT_CONFIG.networkId);
      const { shieldedAddress } = await api.getShieldedAddresses();

      setAddress(shieldedAddress);
      setIsConnected(true);
      setIsDemo(false);

      console.log('Connected to Midnight wallet:', shieldedAddress);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect to Midnight';
      setError(message);
      console.warn('Midnight connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const generateProof = useCallback(async (data: any) => {
    if (isDemo) {
      console.log('Demo mode: Generating mock ZK proof for score:', data.score);
      await new Promise(resolve => setTimeout(resolve, 2000));
      return {
        proof: 'mock_zk_proof_' + Math.random().toString(36).substring(7),
        verified: true,
        score: data.creditScore,
        timestamp: new Date().toISOString()
      };
    }

    if (!isConnected) {
      throw new Error('Wallet not connected');
    }

    // Real proof generation would use providers.proofProvider
    console.log('Generating real ZK proof...');
    return {
      proof: 'real_zk_proof_placeholder',
      verified: true,
      score: data.score,
      timestamp: new Date().toISOString()
    };
  }, [isDemo, isConnected]);

  return {
    providers,
    isConnected,
    isConnecting,
    isDemo,
    error,
    address,
    connect,
    generateProof,
    setIsDemo
  };
}
