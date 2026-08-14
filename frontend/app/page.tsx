'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { TipForm } from './components/TipForm';
import { SupporterWall } from './components/SupporterWall';
import { useEffect, useState } from 'react';

export default function Home() {
  const { isConnected, address, chainId } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const onSepolia = isConnected && chainId === 11155111;
  const wrongNetwork = isConnected && chainId !== 11155111;

  return (
    <main className="page">
      {/* Header */}
      <header className="site-header">
        <nav className="site-nav">
          <div className="site-brand">
            <h1 className="site-title">🙏 Praise Board</h1>
            <p className="site-subtitle">Support Ifeoma's Bus Timetables · Sepolia Testnet</p>
          </div>
          <ConnectButton />
        </nav>
      </header>

      <div className="content-wrap">
        {/* Hero */}
        <section className="hero-section">
          <div className="hero-card">
            <h2 className="hero-headline">Support Public Transit Information</h2>
            <p className="hero-body">
              Ifeoma has kept her city's bus timetables online for three years, helping over
              9,000 commuters every morning. She pays the hosting out of pocket. Send her a
              tip with a note — recorded on Ethereum, no middleman.
            </p>

            {/* Network status */}
            {onSepolia && (
              <p className="net-badge net-ok">✓ Connected to Sepolia</p>
            )}
            {wrongNetwork && (
              <p className="net-badge net-warn">⚠ Switch to Sepolia to send tips</p>
            )}
            {!isConnected && (
              <p className="net-badge net-idle">👆 Connect your wallet to send a tip</p>
            )}
          </div>
        </section>

        {/* Wrong Network Banner */}
        {wrongNetwork && (
          <div className="wrong-network-banner" role="alert">
            <p className="wrong-network-title">⚠ Wrong Network Detected</p>
            <p className="wrong-network-body">
              Your wallet is on chain ID {chainId}. Please switch to{' '}
              <strong>Sepolia Testnet</strong> to send tips.
            </p>
            <a
              href="https://sepoliafaucet.com"
              target="_blank"
              rel="noopener noreferrer"
              className="faucet-link"
            >
              Get Sepolia ETH →
            </a>
          </div>
        )}

        {/* Main grid: TipForm (gated) + SupporterWall (always visible) */}
        <section className="main-grid">
          {/* TipForm — only when connected on Sepolia */}
          <div className="tip-column">
            {onSepolia ? (
              <TipForm />
            ) : (
              <div className="connect-prompt">
                <div className="connect-prompt-inner">
                  <p className="connect-prompt-text">
                    {isConnected
                      ? 'Switch to Sepolia to send a tip'
                      : 'Connect your wallet to send a tip'}
                  </p>
                  {!isConnected && (
                    <div className="connect-btn-wrap">
                      <ConnectButton />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SupporterWall — always visible, populated from on-chain event logs */}
          <div className="wall-column">
            <SupporterWall />
          </div>
        </section>

        <footer className="site-footer">
          <p>
            Tips live on the Ethereum Sepolia blockchain. No platform, no cut, no permission
            required.
          </p>
        </footer>
      </div>
    </main>
  );
}
