// Enhanced PWA registration with update detection
class PWAManager {
  constructor() {
    this.registration = null;
    this.updateAvailable = false;
    this.currentVersion = null;
    this.newVersion = null;
    this.updateCallbacks = [];
  }

  // Register update callback
  onUpdateAvailable(callback) {
    this.updateCallbacks.push(callback);
  }

  // Trigger update callbacks
  triggerUpdateCallbacks() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback({
          currentVersion: this.currentVersion,
          newVersion: this.newVersion,
          updateAvailable: this.updateAvailable
        });
      } catch (error) {
        console.error('[PWA] Update callback error:', error);
      }
    });
  }

  // Install update
  async installUpdate() {
    if (!this.registration || !this.registration.waiting) {
      console.warn('[PWA] No update available to install');
      return false;
    }

    try {
      // Tell the waiting service worker to skip waiting
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Wait for the new service worker to take control
      return new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('[PWA] New service worker took control');
          window.location.reload();
          resolve(true);
        }, { once: true });
      });
    } catch (error) {
      console.error('[PWA] Failed to install update:', error);
      return false;
    }
  }

  // Get current service worker version
  async getCurrentVersion() {
    if (!navigator.serviceWorker.controller) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version);
      };

      navigator.serviceWorker.controller.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }

  // Initialize PWA
  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service workers not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[PWA] Service worker registered:', this.registration.scope);

      // Get current version
      this.currentVersion = await this.getCurrentVersion();
      console.log('[PWA] Current version:', this.currentVersion);

      // Listen for updates
      this.registration.addEventListener('updatefound', () => {
        console.log('[PWA] Update found');
        const newWorker = this.registration.installing;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[PWA] New version available');
            this.updateAvailable = true;
            this.newVersion = '2.0.0'; // This should match the version in sw.js
            this.triggerUpdateCallbacks();
          }
        });
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, version } = event.data;

        if (type === 'SW_UPDATED') {
          console.log('[PWA] Service worker updated to version:', version);
          this.newVersion = version;
          this.updateAvailable = true;
          this.triggerUpdateCallbacks();
        }
      });

      // Check for updates periodically (every 30 minutes)
      setInterval(() => {
        this.registration.update();
      }, 30 * 60 * 1000);

      // Check for updates when page becomes visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.registration.update();
        }
      });

    } catch (error) {
      console.error('[PWA] Service worker registration failed:', error);
    }
  }
}

// Create global PWA manager instance
window.pwaManager = new PWAManager();

// Initialize when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pwaManager.init();
  });
} else {
  window.pwaManager.init();
}
