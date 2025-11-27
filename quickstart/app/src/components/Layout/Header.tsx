import { ConnectButton } from '../Wallet/ConnectButton';

export function Header() {
  return (
    <header className="h-14 border-b border-[rgba(255,255,255,0.1)] bg-[#0f1a1f] flex items-center justify-between" style={{ paddingLeft: '5px', paddingRight: '5px' }}>
      {/* Left: Logo, Brand, and Navigation */}
      <div className="flex items-center gap-6">
        {/* Logo and Brand */}
        <div className="flex items-center gap-2">
          <img 
            src="/assets/logo_green.png" 
            alt="Circuit Logo" 
            className="h-6 w-auto"
            style={{ maxWidth: '24px' }}
          />
          <span className="text-2xl font-normal italic text-white">
            Circuit
          </span>
        </div>

        {/* Navigation - Positioned after logo */}
        <nav className="flex items-center gap-6">
          <a 
            href="#" 
            className="text-sm font-light text-[#ffffff] hover:text-[#50d2c1]/80 transition-colors"
          >
            Trade
          </a>
          <a 
            href="#" 
            className="text-sm font-light text-[#ffffff] hover:text-white/80 transition-colors"
          >
            Portfolio
          </a>
          <a 
            href="#" 
            className="text-sm font-light text-[#ffffff] hover:text-white/80 transition-colors"
          >
            Docs
          </a>
          <a 
            href="#" 
            className="text-sm font-light text-[#ffffff] hover:text-white/80 transition-colors"
          >
            Support
          </a>
        </nav>
      </div>

      {/* Right: Connect Button */}
      <div className="flex items-center">
        <ConnectButton />
      </div>
    </header>
  );
}
