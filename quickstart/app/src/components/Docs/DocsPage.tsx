import { Wallet, Coins, TrendingUp, Lock, Zap, BookOpen, ExternalLink, ArrowLeft } from 'lucide-react';
import { Header } from '../Layout/Header';
import '../../App.css';

interface DocsPageProps {
  onNavigate?: (page: 'trading' | 'portfolio') => void;
}

export function DocsPage({ onNavigate }: DocsPageProps) {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const navigateToTrading = () => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '/trade');
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  return (
    <div className="docs-page">
      <Header currentPage="trading" onNavigate={onNavigate} />
      <div className="docs-container">
        <div className="docs-sidebar">
          <h2 className="docs-sidebar-title">Documentation</h2>
          <nav className="docs-nav">
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('getting-started')}
            >
              <BookOpen size={16} /> Getting Started
            </button>
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('wallet-setup')}
            >
              <Wallet size={16} /> Wallet Setup
            </button>
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('faucet')}
            >
              <Coins size={16} /> Getting Test Tokens
            </button>
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('trading')}
            >
              <TrendingUp size={16} /> Trading Guide
            </button>
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('features')}
            >
              <Zap size={16} /> Platform Features
            </button>
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('privacy')}
            >
              <Lock size={16} /> Privacy & Security
            </button>
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('troubleshooting')}
            >
              <BookOpen size={16} /> Troubleshooting
            </button>
            <button 
              className="docs-nav-link" 
              onClick={() => scrollToSection('resources')}
            >
              <BookOpen size={16} /> Resources
            </button>
          </nav>
        </div>

        <div className="docs-content">
          <div className="docs-header">
            <h1>CircuitX User Guide</h1>
            <p className="docs-subtitle">
              Complete guide to trading private perpetuals on Ztarknet testnet
            </p>
          </div>

          {/* Getting Started */}
          <section id="getting-started" className="docs-section">
            <h2> Getting Started</h2>
            <p>
              CircuitX is a privacy-native perpetual futures DEX built on Ztarknet (Starknet testnet). 
              This guide will walk you through everything you need to start trading private perpetuals.
            </p>
            
            <div className="docs-card">
              <h3>What You'll Need</h3>
              <ul>
                <li>Argent Wallet browser extension</li>
                <li>Testnet tokens (STRK) from Ztarknet faucet</li>
                <li>yUSD tokens (minted via platform faucet)</li>
                <li>A modern browser (Chrome, Firefox, or Brave recommended)</li>
              </ul>
            </div>

            <div className="docs-card">
              <h3>Quick Start Checklist</h3>
              <ol>
                <li>✅ Install Argent Wallet</li>
                <li>✅ Get testnet STRK from Ztarknet faucet</li>
                <li>✅ Connect wallet to CircuitX</li>
                <li>✅ Mint yUSD tokens</li>
                <li>✅ Start trading!</li>
              </ol>
            </div>
          </section>

          {/* Wallet Setup */}
          <section id="wallet-setup" className="docs-section">
            <h2>👛 Wallet Setup - Argent Wallet</h2>
            
            <div className="docs-card">
              <h3>Step 1: Download Argent Wallet</h3>
              <ol>
                <li>
                  Visit <a href="https://www.argent.xyz/" target="_blank" rel="noopener noreferrer">
                    argent.xyz <ExternalLink size={14} />
                  </a>
                </li>
                <li>Click "Get Started" or "Download"</li>
                <li>Choose "Browser Extension" (for desktop) or "Mobile App"</li>
                <li>Follow the installation instructions</li>
              </ol>
            </div>

            <div className="docs-card">
              <h3>Step 2: Create or Import Wallet</h3>
              <h4>New Wallet:</h4>
              <ol>
                <li>Open Argent Wallet extension</li>
                <li>Click "Create New Wallet"</li>
                <li>Write down your recovery phrase (store it securely!)</li>
                <li>Set a password for your wallet</li>
                <li>Complete the setup process</li>
              </ol>

              <h4>Import Existing Wallet:</h4>
              <ol>
                <li>Click "Import Wallet"</li>
                <li>Enter your recovery phrase</li>
                <li>Set a password</li>
              </ol>
            </div>

            <div className="docs-card">
              <h3>Step 3: Switch to Ztarknet Testnet</h3>
              <ol>
                <li>Open Argent Wallet</li>
                <li>Click on the network selector (usually shows "Mainnet" or "Testnet")</li>
                <li>Select "Testnet" or "Ztarknet"</li>
                <li>If Ztarknet is not listed, you may need to add it manually:
                  <ul>
                    <li>Network Name: <code>Ztarknet</code></li>
                    <li>RPC URL: <code>https://ztarknet-madara.d.karnot.xyz</code></li>
                    <li>Chain ID: <code>0x534e5f4d41494e</code></li>
                    <li>Explorer: <code>https://explorer-zstarknet.d.karnot.xyz</code></li>
                  </ul>
                </li>
              </ol>
            </div>

            <div className="docs-warning">
              <strong>⚠️ Important:</strong> Make sure you're on Ztarknet testnet, not mainnet. 
              This is a testnet platform and uses test tokens only.
            </div>
          </section>

          {/* Faucet Guide */}
          <section id="faucet" className="docs-section">
            <h2>💰 Getting Test Tokens</h2>
            
            <div className="docs-card">
              <h3>Step 1: Get Testnet STRK from Ztarknet Faucet</h3>
              <ol>
                <li>
                  Visit the Ztarknet faucet: <a 
                    href="https://starknet-faucet.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    starknet-faucet.vercel.app <ExternalLink size={14} />
                  </a>
                </li>
                <li>Connect your Argent Wallet</li>
                <li>Enter your wallet address (or it will auto-detect)</li>
                <li>Click "Request Tokens" or "Faucet"</li>
                <li>Wait for the transaction to confirm (usually 1-2 minutes)</li>
                <li>You should receive testnet STRK in your wallet</li>
              </ol>
              
              <div className="docs-note">
                <strong>💡 Note:</strong> You need testnet STRK to pay for gas fees on Ztarknet. 
                The faucet typically gives you enough for many transactions.
              </div>
            </div>

            <div className="docs-card">
              <h3>Step 2: Connect Wallet to CircuitX</h3>
              <ol>
                <li>Go to the CircuitX platform</li>
                <li>Click "Connect" button in the top right</li>
                <li>Select "Argent" from the wallet options</li>
                <li>Approve the connection in your wallet</li>
                <li>Your wallet address should now appear in the header</li>
              </ol>
            </div>

            <div className="docs-card">
              <h3>Step 3: Mint yUSD Tokens</h3>
              <p>
                yUSD is the collateral token used on CircuitX. You need yUSD to open positions.
              </p>
              <ol>
                <li>Click the "Faucet" button in the header (or navigate to the faucet page)</li>
                <li>Enter your wallet address (or it will auto-fill)</li>
                <li>Click "Request 1000 yUSD"</li>
                <li>Approve the transaction in your wallet</li>
                <li>Wait for confirmation (~10-30 seconds)</li>
                <li>You'll receive 1000 yUSD tokens</li>
              </ol>

              <div className="docs-note">
                <strong>💡 Tip:</strong> You can request yUSD multiple times if needed. 
                Each request gives you 1000 yUSD.
              </div>
            </div>

            <div className="docs-card">
              <h3>Step 4: Deposit yUSD to Vault</h3>
              <p>
                Before trading, you need to deposit yUSD into the Collateral Vault. 
                This is where your funds are held while trading.
              </p>
              <ol>
                <li>Go to the Trading page</li>
                <li>Find the "Deposit" section or button</li>
                <li>Enter the amount of yUSD you want to deposit</li>
                <li>Click "Deposit"</li>
                <li>Approve the transaction in your wallet</li>
                <li>Wait for confirmation</li>
                <li>Your balance will update to show available funds</li>
              </ol>
            </div>
          </section>

          {/* Trading Guide */}
          <section id="trading" className="docs-section">
            <h2>📈 Trading Guide</h2>

            <div className="docs-card">
              <h3>Understanding Positions</h3>
              <p>
                On CircuitX, you can open <strong>Long</strong> or <strong>Short</strong> positions:
              </p>
              <ul>
                <li><strong>Long:</strong> You profit when the price goes up</li>
                <li><strong>Short:</strong> You profit when the price goes down</li>
              </ul>
              <p>
                All positions are <strong>private</strong> - only commitment hashes are stored on-chain. 
                Your position size, entry price, and direction remain hidden.
              </p>
            </div>

            <div className="docs-card">
              <h3>Opening a Position</h3>
              <ol>
                <li>Navigate to the Trading page</li>
                <li>Select a market (BTC/USD, ETH/USD, etc.) from the dropdown</li>
                <li>Choose your position direction:
                  <ul>
                    <li>Click "Buy Market" for a Long position</li>
                    <li>Click "Sell Market" for a Short position</li>
                  </ul>
                </li>
                <li>Set your margin amount (in yUSD)</li>
                <li>Set your leverage (up to 20x)</li>
                <li>Click "Open Position"</li>
                <li>Wait for ZK proof generation (~10-30 seconds)</li>
                <li>Approve the transaction in your wallet</li>
                <li>Wait for confirmation</li>
              </ol>

              <div className="docs-warning">
                <strong>⚠️ Important:</strong> 
                <ul>
                  <li>Higher leverage = higher risk. Start with lower leverage (5x-10x) if you're new.</li>
                  <li>ZK proof generation takes time. Be patient and don't close the tab.</li>
                  <li>Make sure you have enough yUSD deposited in the vault.</li>
                </ul>
              </div>
            </div>

            <div className="docs-card">
              <h3>Viewing Your Positions</h3>
              <ol>
                <li>Go to the "Portfolio" page</li>
                <li>You'll see all your open positions</li>
                <li>Each position shows:
                  <ul>
                    <li>Market (e.g., BTC/USD)</li>
                    <li>Direction (Long/Short)</li>
                    <li>Leverage</li>
                    <li>Real-time PnL (Profit & Loss)</li>
                    <li>Entry price vs Current price</li>
                    <li>Liquidation price</li>
                  </ul>
                </li>
              </ol>
            </div>

            <div className="docs-card">
              <h3>Closing a Position</h3>
              <ol>
                <li>Go to Portfolio page</li>
                <li>Find the position you want to close</li>
                <li>Click "Close Position"</li>
                <li>Wait for ZK proof generation (~10-30 seconds)</li>
                <li>Approve the transaction in your wallet</li>
                <li>Wait for confirmation</li>
                <li>Your profit/loss will be automatically settled</li>
                <li>Funds will be returned to your vault balance</li>
              </ol>
            </div>

            <div className="docs-card">
              <h3>Understanding Leverage</h3>
              <p>
                Leverage allows you to control a larger position with less capital:
              </p>
              <ul>
                <li><strong>1x:</strong> No leverage - position size = margin</li>
                <li><strong>5x:</strong> Position size = margin × 5</li>
                <li><strong>10x:</strong> Position size = margin × 10</li>
                <li><strong>20x:</strong> Maximum leverage - position size = margin × 20</li>
              </ul>
              <div className="docs-warning">
                <strong>⚠️ Risk Warning:</strong> Higher leverage amplifies both profits and losses. 
                A 1% price move with 20x leverage = 20% gain or loss on your margin.
              </div>
            </div>

            <div className="docs-card">
              <h3>Liquidation</h3>
              <p>
                If your position's value drops too much, it may be liquidated. 
                The liquidation price is shown in your position details.
              </p>
              <ul>
                <li><strong>Long positions:</strong> Liquidated if price drops below liquidation price</li>
                <li><strong>Short positions:</strong> Liquidated if price rises above liquidation price</li>
              </ul>
              <p>
                To avoid liquidation, you can:
              </p>
              <ul>
                <li>Add more margin to your position</li>
                <li>Close the position before it reaches liquidation price</li>
                <li>Use lower leverage</li>
              </ul>
            </div>
          </section>

          {/* Features */}
          <section id="features" className="docs-section">
            <h2>⚡ Platform Features</h2>

            <div className="docs-card">
              <h3>Available Markets</h3>
              <p>CircuitX supports multiple perpetual markets:</p>
              <ul>
                <li><strong>BTC/USD</strong> - Bitcoin perpetual</li>
                <li><strong>ETH/USD</strong> - Ethereum perpetual</li>
                <li><strong>SOL/USD</strong> - Solana perpetual</li>
                <li><strong>STRK/USD</strong> - Starknet perpetual</li>
                <li><strong>BNB/USD</strong> - Binance Coin perpetual</li>
              </ul>
            </div>

            <div className="docs-card">
              <h3>Order Types</h3>
              <ul>
                <li><strong>Market Orders:</strong> Execute immediately at current market price</li>
                <li><strong>Limit Orders:</strong> Execute when price reaches your target (coming soon)</li>
                <li><strong>TWAP Orders:</strong> Time-weighted average price orders (coming soon)</li>
              </ul>
            </div>

            <div className="docs-card">
              <h3>Portfolio Dashboard</h3>
              <p>The Portfolio page provides:</p>
              <ul>
                <li>Total balance overview</li>
                <li>All open positions with real-time PnL</li>
                <li>Vault balance (deposited funds)</li>
                <li>Locked collateral (funds used in positions)</li>
                <li>Available balance (funds available for new positions)</li>
                <li>Position history</li>
              </ul>
            </div>

            <div className="docs-card">
              <h3>Real-Time Price Data</h3>
              <p>
                CircuitX uses Pyth Network for real-time price feeds. 
                Prices update automatically and are displayed in:
              </p>
              <ul>
                <li>Trading interface</li>
                <li>Price charts</li>
                <li>Order book</li>
                <li>Position cards</li>
              </ul>
            </div>
          </section>

          {/* Privacy & Security */}
          <section id="privacy" className="docs-section">
            <h2>🔒 Privacy & Security</h2>

            <div className="docs-card">
              <h3>How Privacy Works</h3>
              <p>
                CircuitX uses Zero-Knowledge (ZK) proofs to keep your trading activity private:
              </p>
              <ol>
                <li><strong>Private Inputs:</strong> Your position size, entry price, margin, and direction are kept private</li>
                <li><strong>ZK Proof Generation:</strong> A cryptographic proof is generated that proves your position is valid without revealing details</li>
                <li><strong>Commitment Hash:</strong> Only a commitment hash is stored on-chain - impossible to reverse</li>
                <li><strong>On-Chain Verification:</strong> The smart contract verifies the proof is valid</li>
              </ol>
            </div>

            <div className="docs-card">
              <h3>What's Public vs Private</h3>
              <div className="docs-table">
                <table>
                  <thead>
                    <tr>
                      <th>Public (On-Chain)</th>
                      <th>Private (Your Device Only)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Commitment hash</td>
                      <td>Position size</td>
                    </tr>
                    <tr>
                      <td>Your wallet address</td>
                      <td>Entry price</td>
                    </tr>
                    <tr>
                      <td>Market ID</td>
                      <td>Margin amount</td>
                    </tr>
                    <tr>
                      <td>Timestamp</td>
                      <td>Direction (long/short)</td>
                    </tr>
                    <tr>
                      <td>Locked collateral amount</td>
                      <td>Trading strategy</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="docs-card">
              <h3>Security Best Practices</h3>
              <ul>
                <li><strong>Never share your recovery phrase</strong> - Store it securely offline</li>
                <li><strong>Verify you're on Ztarknet testnet</strong> - Check the network in your wallet</li>
                <li><strong>Double-check contract addresses</strong> - Only interact with verified contracts</li>
                <li><strong>Start with small amounts</strong> - Test the platform before large trades</li>
                <li><strong>Keep your browser updated</strong> - For security patches</li>
                <li><strong>Use hardware wallet for mainnet</strong> - When mainnet launches</li>
              </ul>
            </div>

            <div className="docs-card">
              <h3>MEV Protection</h3>
              <p>
                Because your positions are private, MEV (Maximal Extractable Value) bots cannot:
              </p>
              <ul>
                <li>See your position size</li>
                <li>Front-run your trades</li>
                <li>Copy your trading strategy</li>
                <li>Target you for liquidation</li>
              </ul>
            </div>
          </section>

          {/* Troubleshooting */}
          <section id="troubleshooting" className="docs-section">
            <h2>🔧 Troubleshooting</h2>

            <div className="docs-card">
              <h3>Common Issues</h3>
              
              <h4>Wallet won't connect</h4>
              <ul>
                <li>Make sure Argent Wallet extension is installed and unlocked</li>
                <li>Refresh the page and try again</li>
                <li>Check that you're on Ztarknet testnet in your wallet</li>
                <li>Try disconnecting and reconnecting</li>
              </ul>

              <h4>Transaction fails</h4>
              <ul>
                <li>Check you have enough testnet STRK for gas</li>
                <li>Make sure you have enough yUSD in your vault</li>
                <li>Try increasing gas limit in wallet settings</li>
                <li>Wait a few minutes and try again (network congestion)</li>
              </ul>

              <h4>ZK proof generation is slow</h4>
              <ul>
                <li>This is normal - proof generation takes 10-30 seconds</li>
                <li>Don't close the tab or navigate away</li>
                <li>Make sure your browser isn't throttling the tab</li>
                <li>Try refreshing if it's been more than 2 minutes</li>
              </ul>

              <h4>Can't see my position</h4>
              <ul>
                <li>Check the Portfolio page</li>
                <li>Make sure you're connected with the same wallet</li>
                <li>Refresh the page</li>
                <li>Check the explorer to verify the transaction went through</li>
              </ul>

              <h4>Balance not updating</h4>
              <ul>
                <li>Wait for transaction confirmation (can take 1-2 minutes)</li>
                <li>Refresh the page</li>
                <li>Check your wallet for the transaction status</li>
                <li>Verify on the explorer: <a 
                  href="https://explorer-zstarknet.d.karnot.xyz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  explorer-zstarknet.d.karnot.xyz <ExternalLink size={14} />
                </a></li>
              </ul>
            </div>
          </section>

          {/* Resources */}
          <section id="resources" className="docs-section">
            <h2>📚 Additional Resources</h2>

            <div className="docs-card">
              <h3>Useful Links</h3>
              <ul>
                <li>
                  <a href="https://ztarknet-madara.d.karnot.xyz" target="_blank" rel="noopener noreferrer">
                    Ztarknet RPC <ExternalLink size={14} />
                  </a> - Network endpoint
                </li>
                <li>
                  <a href="https://explorer-zstarknet.d.karnot.xyz" target="_blank" rel="noopener noreferrer">
                    Ztarknet Explorer <ExternalLink size={14} />
                  </a> - View transactions
                </li>
                <li>
                  <a href="https://starknet-faucet.vercel.app/" target="_blank" rel="noopener noreferrer">
                    Ztarknet Faucet <ExternalLink size={14} />
                  </a> - Get testnet STRK
                </li>
                <li>
                  <a href="https://www.argent.xyz/" target="_blank" rel="noopener noreferrer">
                    Argent Wallet <ExternalLink size={14} />
                  </a> - Download wallet
                </li>
              </ul>
            </div>

            <div className="docs-card">
              <h3>Contract Addresses</h3>
              <p>For reference, here are the main contract addresses on Ztarknet:</p>
              <ul className="docs-addresses">
                <li><strong>PerpRouter:</strong> <code>0x057c9a38d9cfe77f8f0965b84e99398dbb2722bdfa380c466f10b13f2d3f8c41</code></li>
                <li><strong>yUSD Token:</strong> <code>0x0374317fb45421115f2b3b3df22dce36d922a00eb7b2f80966ebc23cb8b2cfda</code></li>
                <li><strong>Verifier:</strong> <code>0x3f5bd2451155beaa736a44d68a9fa6dc38be2a34e9403eb68beb83bcb67c839</code></li>
              </ul>
            </div>
          </section>

          {/* Call to Action */}
          <section className="docs-section">
            <div className="docs-cta">
              <h2>Ready to Start Trading?</h2>
              <p>Now that you understand how CircuitX works, you're ready to start trading private perpetuals!</p>
              <button 
                className="docs-cta-button"
                onClick={navigateToTrading}
              >
                Go to Trading Page
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
