import '../../App.css';

interface LandingPageProps {
  onStartTrading: () => void;
}

export function LandingPage({ onStartTrading }: LandingPageProps) {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="landing-hero-overlay" />

        <header className="landing-header">
          <div className="landing-logo">
            CircuitX
          </div>

          <nav className="landing-nav">
            <button
              type="button"
              className="landing-nav-link"
              onClick={() => {
                onStartTrading();
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/trade');
                }
              }}
            >
              Trade
            </button>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.history.pushState({}, '', '/docs');
                  window.dispatchEvent(new PopStateEvent('popstate'));
                }
              }}
              className="landing-nav-link"
            >
              Docs
            </button>
            <a
              href="https://x.com/i/communities/2015047501058097323"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-link"
            >
              Support
            </a>
            <a
              href="https://dexscreener.com/solana/2FcRaEB4NCoUvR5NNLCrPM9iTT3pGaKTh823zjFjBAGS?id=0adabfc9&ref=trojan"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-link"
              style={{ color: '#00ff88', fontWeight: '600' }}
            >
              BUY $CUIT
            </a>
          </nav>
        </header>

        <main className="landing-hero-content">
          <h1 className="landing-hero-title">
            Trade Private Perpetuals.<br />
            Prove Validity, Never Identity.
          </h1>

          <p className="landing-hero-subtitle">
            Built on Ztarknet. Programmable, privacy-native margin trading anchored by Zcash security.
            Full leverage, zero leaks, no intermediaries.
          </p>

          <div className="landing-hero-actions">
            <button
              type="button"
              className="landing-hero-button"
              onClick={onStartTrading}
            >
              Start Trading
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}


