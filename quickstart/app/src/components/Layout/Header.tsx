import { ConnectButton } from '../Wallet/ConnectButton';

export function Header() {
  return (
    <header className="h-12 border-b border-[rgba(255,255,255,0.1)] bg-[#0f1a1f] flex items-center justify-between px-2">
      {/* Left: Logo and Brand */}
      <div className="flex items-center gap-2">
        <img 
          src="/assets/logo_green.png" 
          alt="Circuit Logo" 
          className="h-6 w-6"
        />
        <span className="text-base font-medium italic text-white">
          Circuit
        </span>
      </div>

      {/* Center: Navigation */}
      <nav className="flex items-center gap-8">
        <a 
          href="#" 
          className="text-sm text-[#50d2c1] hover:text-[#50d2c1]/80 transition-colors"
        >
          Trade
        </a>
        <a 
          href="#" 
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Portfolio
        </a>
        <a 
          href="#" 
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Docs
        </a>
        <a 
          href="#" 
          className="text-sm text-white/70 hover:text-white transition-colors"
        >
          Support
        </a>
      </nav>

      {/* Right: Connect Button */}
      <div className="flex items-center">
        <ConnectButton />
      </div>
    </header>
  );
}
