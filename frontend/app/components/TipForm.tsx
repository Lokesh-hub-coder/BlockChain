'use client';

import { useState, useRef, useEffect } from 'react';
import { useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther } from 'viem';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contract';

type TxStatus = 'idle' | 'pending' | 'confirming' | 'success' | 'reverted' | 'rejected' | 'error';

function isUserRejection(error: any): boolean {
  // EIP-1193 user rejected: code 4001
  if (error?.code === 4001) return true;
  // wagmi / viem wraps it as UserRejectedRequestError
  if (error?.name === 'UserRejectedRequestError') return true;
  // ethers.js ACTION_REJECTED
  if (error?.code === 'ACTION_REJECTED') return true;
  // Fallback: message substring match
  const msg: string = error?.message ?? '';
  if (
    msg.toLowerCase().includes('user rejected') ||
    msg.toLowerCase().includes('user denied') ||
    msg.toLowerCase().includes('rejected the request') ||
    msg.toLowerCase().includes('declined')
  ) {
    return true;
  }
  return false;
}

export function TipForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState('0.01');
  const [note, setNote] = useState('');
  const [txStatus, setTxStatus] = useState<TxStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const formRef = useRef<HTMLFormElement>(null);

  const { writeContract, isPending, data: hash } = useWriteContract();

  // TC9: read receipt and inspect its status field
  const {
    isLoading: isConfirming,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash });

  // TC9: explicitly branch on receipt.status ('success' vs 'reverted')
  useEffect(() => {
    if (!receipt) return;
    if (receipt.status === 'success') {
      setTxStatus('success');
      setNote('');
      setAmount('0.01');
      if (formRef.current) formRef.current.reset();
    } else if (receipt.status === 'reverted') {
      // Transaction resolved but reverted on-chain — distinct branch from success
      setTxStatus('reverted');
      setErrorMessage('Transaction was reverted on-chain. Your tip was not sent.');
    }
  }, [receipt]);

  useEffect(() => {
    if (isPending) setTxStatus('pending');
  }, [isPending]);

  useEffect(() => {
    if (isConfirming) setTxStatus('confirming');
  }, [isConfirming]);

  // Auto-clear transient messages
  useEffect(() => {
    if (txStatus === 'success' || txStatus === 'rejected' || txStatus === 'error' || txStatus === 'reverted') {
      const t = setTimeout(() => setTxStatus('idle'), 8000);
      return () => clearTimeout(t);
    }
  }, [txStatus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setTxStatus('idle');

    if (!address) {
      setErrorMessage('Please connect your wallet first.');
      setTxStatus('error');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setErrorMessage('Tip amount must be greater than 0.');
      setTxStatus('error');
      return;
    }

    if (note.length === 0) {
      setErrorMessage('Please add a message for Ifeoma.');
      setTxStatus('error');
      return;
    }

    if (note.length > 280) {
      setErrorMessage('Message must be 280 characters or less.');
      setTxStatus('error');
      return;
    }

    writeContract(
      {
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'tip',
        args: [note],
        value: parseEther(amount),
      } as any,
      {
        onSuccess: () => {
          // tx submitted — wait for receipt via useWaitForTransactionReceipt
          setTxStatus('confirming');
        },
        onError: (error: any) => {
          // TC8: rejected wallet prompt is its own branch, distinct from other errors
          if (isUserRejection(error)) {
            setTxStatus('rejected');
            setErrorMessage('');
          } else if (error?.message?.includes('Note too long')) {
            setTxStatus('error');
            setErrorMessage('Your message exceeds 280 characters. Please shorten it.');
          } else {
            setTxStatus('error');
            setErrorMessage(error?.shortMessage ?? error?.message ?? 'Failed to send tip.');
          }
        },
      }
    );
  };

  const isDisabled = isPending || isConfirming;

  return (
    <div className="tip-form-card">
      <h3 className="form-title">Send Your Support</h3>

      <form ref={formRef} onSubmit={handleSubmit} className="tip-form">
        {/* Amount */}
        <div className="field-group">
          <label className="field-label" htmlFor="tip-amount">
            Tip Amount (ETH)
          </label>
          <div className="amount-row">
            <input
              id="tip-amount"
              type="number"
              step="0.001"
              min="0.001"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="amount-input"
              placeholder="0.01"
              disabled={isDisabled}
            />
            <div className="preset-btns">
              {['0.01', '0.05', '0.1'].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount(v)}
                  className={`preset-btn${amount === v ? ' active' : ''}`}
                  disabled={isDisabled}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Note */}
        <div className="field-group">
          <label className="field-label" htmlFor="tip-note">
            Your Message&nbsp;
            <span className={`char-count${note.length > 260 ? ' warn' : ''}`}>
              {note.length}/280
            </span>
          </label>
          <textarea
            id="tip-note"
            value={note}
            onChange={(e) => {
              if (e.target.value.length <= 280) setNote(e.target.value);
            }}
            className="note-input"
            rows={4}
            placeholder="Share a message of thanks for Ifeoma (max 280 chars)…"
            disabled={isDisabled}
          />
        </div>

        {/* TC8: Rejected — own calm branch */}
        {txStatus === 'rejected' && (
          <div className="status-box status-rejected" role="alert">
            <span className="status-icon">🚫</span>
            <div>
              <p className="status-title">Wallet prompt declined</p>
              <p className="status-body">You cancelled the request. No funds were moved.</p>
            </div>
          </div>
        )}

        {/* TC9: Reverted — own branch */}
        {txStatus === 'reverted' && (
          <div className="status-box status-error" role="alert">
            <span className="status-icon">⚠️</span>
            <div>
              <p className="status-title">Transaction reverted</p>
              <p className="status-body">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Generic error */}
        {txStatus === 'error' && errorMessage && (
          <div className="status-box status-error" role="alert">
            <span className="status-icon">❌</span>
            <div>
              <p className="status-title">Error</p>
              <p className="status-body">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Confirming */}
        {txStatus === 'confirming' && (
          <div className="status-box status-info" role="status">
            <span className="status-icon spin-icon">⏳</span>
            <div>
              <p className="status-title">Confirming on-chain…</p>
              <p className="status-body">Waiting for the block to be mined. This takes ~15 s.</p>
            </div>
          </div>
        )}

        {/* TC9: Success — confirmed & status === 'success' */}
        {txStatus === 'success' && (
          <div className="status-box status-success" role="status">
            <span className="status-icon">✅</span>
            <div>
              <p className="status-title">Tip confirmed!</p>
              <p className="status-body">
                Your support is now permanently on the blockchain. Thank you! 🙏
              </p>
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          id="send-tip-btn"
          type="submit"
          disabled={isDisabled}
          className={`submit-btn${isDisabled ? ' disabled' : ''}`}
        >
          {isPending
            ? '⏳ Waiting for wallet…'
            : isConfirming
            ? '🔗 Confirming…'
            : '💫 Send Tip'}
        </button>

        <p className="form-footnote">
          No platform fees · Direct blockchain transaction · Sepolia testnet
        </p>
      </form>
    </div>
  );
}
