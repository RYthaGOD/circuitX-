import { useState } from 'react';
import { ConnectButton } from '../Wallet/ConnectButton';
import { FaucetModal } from '../Wallet/FaucetModal';
import { NetworkNotification } from './NetworkNotification';
import { SettingsModal } from './SettingsModal';
import '../../App.css';

interface HeaderProps {
  currentPage?: 'trading' | 'portfolio';
  onNavigate?: (page: 'trading' | 'portfolio') => void;
}

export function Header({ currentPage = 'trading', onNavigate }: HeaderProps) {
  const [showFaucet, setShowFaucet] = useState(false);

  return (
    <header className="app-header">
      {/* Left: Logo, Brand, and Navigation */}
      <div className="app-header-left">
        {/* Logo and Brand */}
        <div className="app-header-logo-container">
          <img 
            src="/assets/logo_green.png" 
            alt="Circuit Logo" 
            className="app-header-logo"
          />
          <span className="app-header-brand">
            CircuitX
          </span>
        </div>

        {/* Navigation - Positioned after logo */}
        <nav className="app-header-nav">
          <button
            onClick={() => onNavigate?.('trading')}
            className={`app-header-nav-link ${currentPage === 'trading' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Trade
          </button>
          <button
            onClick={() => onNavigate?.('portfolio')}
            className={`app-header-nav-link ${currentPage === 'portfolio' ? 'active' : ''}`}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Portfolio
          </button>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.history.pushState({}, '', '/docs');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }}
            className="app-header-nav-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Docs
          </button>
          <a 
            href="https://x.com/i/communities/2015047501058097323"
            target="_blank"
            rel="noopener noreferrer"
            className="app-header-nav-link"
          >
            Support
          </a>
          <a
            href="https://dexscreener.com/solana/2FcRaEB4NCoUvR5NNLCrPM9iTT3pGaKTh823zjFjBAGS?id=0adabfc9&ref=trojan"
            target="_blank"
            rel="noopener noreferrer"
            className="app-header-nav-link"
            style={{ color: '#00ff88', fontWeight: '600' }}
          >
            BUY $CUIT
          </a>
          <button
            onClick={() => setShowFaucet(true)}
            className="app-header-nav-button"
          >
            Faucet
          </button>
        </nav>
      </div>

      {/* Right: Connect Button and Icons */}
      <div className="app-header-right">
        <ConnectButton />
        <NetworkNotification />
        <SettingsModal />
      </div>
      <FaucetModal isOpen={showFaucet} onClose={() => setShowFaucet(false)} />
    </header>
  );
}
