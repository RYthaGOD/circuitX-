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
              onClick={onStartTrading}
            >
              Trade
            </button>
            <a
              href="https://github.com/YieldStark/perpl/blob/main/docs/ARCHITECTURE.md"
              target="_blank"
              rel="noopener noreferrer"
              className="landing-nav-link"
            >
              Docs
            </a>
            <a
              href="#support"
              className="landing-nav-link"
            >
              Support
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


