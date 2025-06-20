'use client';

import React, { useState, useEffect } from 'react';
import NavigationHeader from '@/components/NavigationHeader';
import UpdateNotification from '@/components/UpdateNotification';

const PWATestPage: React.FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [newVersion, setNewVersion] = useState<string | null>(null);
  const [swStatus, setSWStatus] = useState('Checking...');
  const [cacheInfo, setCacheInfo] = useState<string[]>([]);

  useEffect(() => {
    checkPWAStatus();
  }, []);

  const checkPWAStatus = async () => {
    if (!('serviceWorker' in navigator)) {
      setSWStatus('Service Worker not supported');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        setSWStatus('Service Worker registered');
        
        // Get current version
        if (window.pwaManager) {
          const version = await window.pwaManager.getCurrentVersion();
          setCurrentVersion(version);
        }
      } else {
        setSWStatus('Service Worker not registered');
      }

      // Check cache status
      const cacheNames = await caches.keys();
      setCacheInfo(cacheNames);
    } catch (error) {
      setSWStatus(`Error: ${error}`);
    }
  };

  const simulateUpdate = () => {
    setUpdateAvailable(true);
    setNewVersion('2.1.0');
  };

  const handleUpdate = async () => {
    console.log('Installing update...');
    // Simulate update process
    await new Promise(resolve => setTimeout(resolve, 2000));
    setUpdateAvailable(false);
    setCurrentVersion('2.1.0');
    alert('Update installed! (Simulated)');
  };

  const dismissUpdate = () => {
    setUpdateAvailable(false);
  };

  const clearCaches = async () => {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(name => caches.delete(name))
      );
      setCacheInfo([]);
      alert('All caches cleared!');
    } catch (error) {
      alert(`Error clearing caches: ${error}`);
    }
  };

  const pageStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, rgb(20, 16, 44) 0%, rgb(30, 20, 54) 100%)',
    color: 'white',
    display: 'flex',
    flexDirection: 'column'
  };

  const contentStyle: React.CSSProperties = {
    flex: 1,
    padding: '20px',
    maxWidth: '600px',
    margin: '0 auto',
    width: '100%'
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'rgb(100, 30, 150)',
    color: 'white',
    border: 'none',
    padding: '12px 20px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer',
    marginRight: '10px',
    marginBottom: '10px',
    transition: 'background-color 0.2s ease'
  };

  return (
    <div style={pageStyle}>
      <NavigationHeader title="PWA Test" />
      
      <UpdateNotification
        isVisible={updateAvailable}
        onUpdate={handleUpdate}
        onDismiss={dismissUpdate}
        version={newVersion || undefined}
      />
      
      <div style={contentStyle}>
        <h1 style={{ fontSize: '28px', marginBottom: '30px', textAlign: 'center' }}>
          PWA Update System Test
        </h1>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Service Worker Status</h2>
          <p><strong>Status:</strong> {swStatus}</p>
          <p><strong>Current Version:</strong> {currentVersion || 'Unknown'}</p>
          <button style={buttonStyle} onClick={checkPWAStatus}>
            Refresh Status
          </button>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Update Testing</h2>
          <p>Test the update notification system:</p>
          <button style={buttonStyle} onClick={simulateUpdate}>
            Simulate Update Available
          </button>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>Cache Management</h2>
          <p><strong>Active Caches:</strong></p>
          <ul style={{ marginBottom: '15px' }}>
            {cacheInfo.length > 0 ? (
              cacheInfo.map((cache, index) => (
                <li key={index} style={{ marginBottom: '5px' }}>{cache}</li>
              ))
            ) : (
              <li>No caches found</li>
            )}
          </ul>
          <button style={buttonStyle} onClick={clearCaches}>
            Clear All Caches
          </button>
        </div>

        <div style={sectionStyle}>
          <h2 style={{ fontSize: '20px', marginBottom: '15px' }}>PWA Features</h2>
          <ul>
            <li>✅ Service Worker with version management</li>
            <li>✅ Automatic update detection</li>
            <li>✅ User-friendly update notifications</li>
            <li>✅ Cache strategies for different asset types</li>
            <li>✅ Offline functionality</li>
            <li>✅ Audio file caching for quiz songs</li>
            <li>✅ localStorage preservation during updates</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PWATestPage;
