import React, { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const WalletConnection = ({ onWalletConnect, onPaymentSuccess }) => {
  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (connected && publicKey) {
      fetchBalance();
      onWalletConnect?.(publicKey.toString());
    }
  }, [connected, publicKey]);

  const fetchBalance = async () => {
    if (publicKey) {
      try {
        const balance = await connection.getBalance(publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      }
    }
  };

  const handleCryptoPayment = async (packageType) => {
    if (!publicKey || !connected) {
      alert('Please connect your wallet first!');
      return;
    }

    setIsLoading(true);
    try {
      // Get payment details from backend
      const paymentResponse = await axios.post(`${API}/crypto/payment-request`, {
        wallet_address: publicKey.toString(),
        package_type: packageType,
        network: 'solana',
        currency: 'SOL'
      });

      const { payment_address, amount_sol, payment_id } = paymentResponse.data;

      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: publicKey,
          toPubkey: new PublicKey(payment_address),
          lamports: amount_sol * LAMPORTS_PER_SOL,
        })
      );

      // Send transaction
      const signature = await sendTransaction(transaction, connection);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      // Notify backend of successful payment
      await axios.post(`${API}/crypto/payment-confirm`, {
        payment_id,
        tx_hash: signature,
        wallet_address: publicKey.toString()
      });

      onPaymentSuccess?.({ signature, packageType, amount: amount_sol });
      
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="wallet-connection">
      {!connected ? (
        <div className="wallet-connect-section">
          <h3 className="wallet-title">Connect Your Solana Wallet</h3>
          <p className="wallet-description">Connect Phantom or other Solana wallets to pay with SOL</p>
          <WalletMultiButton className="wallet-connect-btn" />
        </div>
      ) : (
        <div className="wallet-connected">
          <div className="wallet-info">
            <div className="wallet-header">
              <span className="wallet-address">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </span>
              <span className="wallet-balance">{balance.toFixed(4)} SOL</span>
            </div>
            <WalletDisconnectButton className="wallet-disconnect-btn" />
          </div>
          
          <div className="crypto-payment-options">
            <h4 className="payment-title">Pay with SOL</h4>
            <div className="payment-packages">
              <PaymentPackage
                title="Basic"
                price="0.5 SOL"
                features={['AI Tokenomics Design', 'PDF Report', 'Charts & Visualizations']}
                onPay={() => handleCryptoPayment('basic')}
                isLoading={isLoading}
              />
              <PaymentPackage
                title="Pro"
                price="1.2 SOL"
                features={['Everything in Basic', 'Multiple Iterations', 'Advanced Analytics', 'Comparative Analysis']}
                onPay={() => handleCryptoPayment('pro')}
                isLoading={isLoading}
                popular={true}
              />
              <PaymentPackage
                title="Premium"
                price="3.0 SOL"
                features={['Everything in Pro', 'Investor Deck', 'Smart Contract Templates', '1-on-1 Consultation']}
                onPay={() => handleCryptoPayment('premium')}
                isLoading={isLoading}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const PaymentPackage = ({ title, price, features, onPay, isLoading, popular }) => (
  <div className={`payment-package ${popular ? 'popular' : ''}`}>
    {popular && <div className="popular-badge">Most Popular</div>}
    <h5 className="package-title">{title}</h5>
    <div className="package-price">{price}</div>
    <ul className="package-features">
      {features.map((feature, index) => (
        <li key={index}>{feature}</li>
      ))}
    </ul>
    <button 
      className="pay-btn"
      onClick={onPay}
      disabled={isLoading}
    >
      {isLoading ? 'Processing...' : `Pay ${price}`}
    </button>
  </div>
);

export default WalletConnection;