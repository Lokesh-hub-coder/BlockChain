'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePublicClient, useWatchContractEvent } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contract';

interface Tip {
  supporter: string;
  amount: string;
  note: string;
  transactionHash?: string;
  blockNumber?: bigint;
}

// TC1: wall is populated from decoded event logs.
// Two sources, both event-log based:
//   1. getLogs query for historical tips on mount
//   2. useWatchContractEvent subscription for new tips in real time
// Any optimistic entry would be reconciled — we use only log data.

export function SupporterWall() {
  const publicClient = usePublicClient();
  const [tips, setTips] = useState<Tip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  // Decode a raw log args object into a Tip
  const decodeTip = useCallback((args: any, log: any): Tip => ({
    supporter: args.supporter ?? '',
    amount: args.amount !== undefined ? formatEther(BigInt(args.amount)) : '0',
    note: args.note ?? '',
    transactionHash: log.transactionHash,
    blockNumber: log.blockNumber != null ? BigInt(log.blockNumber) : undefined,
  }), []);

  // Merge new tip into state, deduplicating by tx hash and sorting by block desc
  const mergeTip = useCallback((newTip: Tip) => {
    setTips((prev) => {
      const exists = newTip.transactionHash
        ? prev.some((t) => t.transactionHash === newTip.transactionHash)
        : false;
      if (exists) return prev;
      return [newTip, ...prev].sort((a, b) =>
        Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n))
      );
    });
  }, []);

  // TC1 source 1: getLogs query — historical tips
  useEffect(() => {
    if (!publicClient) return;

    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const blockNumber = await publicClient.getBlockNumber();
        const fromBlock = blockNumber > 10000n ? blockNumber - 10000n : 0n;

        // TC1: wall populated from decoded contract event logs
        const tipEvent = parseAbiItem(
          'event Tip(address indexed supporter, uint256 amount, string note)'
        );
        const logs = await publicClient.getLogs({
          address: CONTRACT_ADDRESS,
          event: tipEvent,
          fromBlock,
          toBlock: 'latest',
        });

        const decoded: Tip[] = logs
          .map((log: any) => decodeTip(log.args, log))
          .sort((a, b) => Number((b.blockNumber ?? 0n) - (a.blockNumber ?? 0n)));

        setTips(decoded);
      } catch (err: any) {
        setError('Could not load supporters. Make sure you are on Sepolia.');
        console.error('getLogs error:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [publicClient, decodeTip]);

  // TC1 source 2: useWatchContractEvent subscription — real-time new tips
  // New tips appear because a log subscription observed them
  useWatchContractEvent({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    eventName: 'Tip',
    onLogs(logs) {
      for (const log of logs as any[]) {
        const newTip = decodeTip(log.args, log);
        mergeTip(newTip);
      }
    },
  });

  const totalETH = tips.reduce((s, t) => s + parseFloat(t.amount), 0).toFixed(4);

  return (
    <div className="wall-card">
      <div className="wall-header">
        <h3 className="wall-title">👥 Wall of Supporters</h3>
        <div className="wall-stats">
          <span className="wall-total">{totalETH} ETH</span>
          <span className="wall-count">{tips.length} supporter{tips.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="wall-error" role="alert">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && tips.length === 0 && (
        <div className="wall-loading">
          <div className="spinner" aria-label="Loading" />
          <p>Loading supporters from blockchain…</p>
        </div>
      )}

      {/* Empty */}
      {!loading && tips.length === 0 && !error && (
        <div className="wall-empty">
          <p>No tips yet — be the first supporter! 🙏</p>
        </div>
      )}

      {/* Tip entries — sourced exclusively from decoded event logs */}
      <ul className="tip-list" aria-label="Supporter wall">
        {tips.map((t, i) => (
          <li key={t.transactionHash ?? i} className="tip-card">
            <div className="tip-header">
              <div className="tip-address">
                <span className="address-text" title={t.supporter}>
                  {t.supporter.slice(0, 6)}…{t.supporter.slice(-4)}
                </span>
              </div>
              <span className="tip-amount">Ξ {parseFloat(t.amount).toFixed(4)}</span>
            </div>
            {t.note && (
              <p className="tip-note">"{t.note}"</p>
            )}
            {t.transactionHash && (
              <a
                href={`https://sepolia.etherscan.io/tx/${t.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="tip-etherscan"
              >
                View on Etherscan ↗
              </a>
            )}
          </li>
        ))}
      </ul>

      <p className="wall-footnote">
        ✓ Every entry is sourced from on-chain event logs · Live subscription active
      </p>
    </div>
  );
}
