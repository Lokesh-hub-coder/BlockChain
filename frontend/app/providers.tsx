'use client';

import { ReactNode } from 'react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import { sepolia } from 'wagmi/chains';
import '@rainbow-me/rainbowkit/styles.css';

// WalletConnect projectId — get yours at https://cloud.walletconnect.com
// This is a public demo project ID; replace with your own for production
const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? 'b56e18d47c72ab683b10814fe9495694';

const config = getDefaultConfig({
  appName: 'Praise Board',
  projectId,
  chains: [sepolia],
  ssr: true,
});

// QueryClient for wagmi v2's TanStack Query dependency
const queryClient = new QueryClient();

export function Providers({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
