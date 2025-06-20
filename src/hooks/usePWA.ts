'use client';

import { useState, useEffect, useCallback } from 'react';

interface PWAUpdateInfo {
  currentVersion: string | null;
  newVersion: string | null;
  updateAvailable: boolean;
}

interface PWAManager {
  onUpdateAvailable: (callback: (info: PWAUpdateInfo) => void) => void;
  installUpdate: () => Promise<boolean>;
  getCurrentVersion: () => Promise<string | null>;
}

declare global {
  interface Window {
    pwaManager?: PWAManager;
  }
}

export const usePWA = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  // Handle update availability
  const handleUpdateAvailable = useCallback((info: PWAUpdateInfo) => {
    console.log('[PWA Hook] Update available:', info);
    setUpdateAvailable(info.updateAvailable);
    setCurrentVersion(info.currentVersion);
    setNewVersion(info.newVersion);
  }, []);

  // Install update
  const installUpdate = useCallback(async () => {
    if (!window.pwaManager || isInstalling) {
      return false;
    }

    setIsInstalling(true);
    
    try {
      const success = await window.pwaManager.installUpdate();
      return success;
    } catch (error) {
      console.error('[PWA Hook] Install update failed:', error);
      setIsInstalling(false);
      return false;
    }
  }, [isInstalling]);

  // Dismiss update notification
  const dismissUpdate = useCallback(() => {
    setUpdateAvailable(false);
    
    // Store dismissal in localStorage to avoid showing again for this version
    if (newVersion) {
      try {
        localStorage.setItem('pwa-dismissed-version', newVersion);
      } catch (error) {
        console.warn('[PWA Hook] Failed to store dismissal:', error);
      }
    }
  }, [newVersion]);

  // Check if update was previously dismissed
  const wasUpdateDismissed = useCallback((version: string) => {
    try {
      const dismissedVersion = localStorage.getItem('pwa-dismissed-version');
      return dismissedVersion === version;
    } catch (error) {
      return false;
    }
  }, []);

  useEffect(() => {
    // Wait for PWA manager to be available
    const checkPWAManager = () => {
      if (window.pwaManager) {
        // Register for update notifications
        window.pwaManager.onUpdateAvailable((info) => {
          // Don't show notification if this version was already dismissed
          if (info.newVersion && !wasUpdateDismissed(info.newVersion)) {
            handleUpdateAvailable(info);
          }
        });

        // Get current version
        window.pwaManager.getCurrentVersion().then(version => {
          setCurrentVersion(version);
        });
      } else {
        // Retry after a short delay
        setTimeout(checkPWAManager, 100);
      }
    };

    checkPWAManager();
  }, [handleUpdateAvailable, wasUpdateDismissed]);

  return {
    updateAvailable,
    currentVersion,
    newVersion,
    isInstalling,
    installUpdate,
    dismissUpdate
  };
};
