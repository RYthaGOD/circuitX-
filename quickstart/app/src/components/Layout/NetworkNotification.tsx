import { useState, useEffect } from 'react';
import { Globe } from 'lucide-react';

export function NetworkNotification() {
  const [showNotification, setShowNotification] = useState(false);

  const handleGlobeClick = () => {
    setShowNotification(true);
    // Auto-hide after 4 seconds
    setTimeout(() => {
      setShowNotification(false);
    }, 4000);
  };

  return (
    <>
      <button
        onClick={handleGlobeClick}
        className="header-icon-button"
        type="button"
      >
        <Globe size={18} />
      </button>

      {/* Notification Box */}
      {showNotification && (
        <div className="network-notification-container">
          <div className="network-notification-content">
            <div className="network-notification-inner">
              <div className="network-notification-icon-box">
                <Globe size={20} />
              </div>
              <div className="network-notification-text">
                <div className="network-notification-title">
                  Live on Ztarknet Network
                </div>
                <div className="network-notification-subtitle">
                  Decentralized perpetual trading
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

