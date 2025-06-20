'use client';

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faDownload, faTimes, faSync } from '@fortawesome/free-solid-svg-icons';

interface UpdateNotificationProps {
  isVisible: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  version?: string;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({
  isVisible,
  onUpdate,
  onDismiss,
  version
}) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate();
    } catch (error) {
      console.error('Update failed:', error);
      setIsUpdating(false);
    }
  };

  if (!isVisible) return null;

  const notificationStyle: React.CSSProperties = {
    position: 'fixed',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgb(30, 20, 54)',
    color: 'white',
    padding: '16px 20px',
    borderRadius: '12px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 10000,
    maxWidth: '400px',
    width: '90%',
    animation: 'slideDown 0.3s ease-out'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '12px'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 'bold',
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  };

  const messageStyle: React.CSSProperties = {
    fontSize: '14px',
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: '16px',
    lineHeight: '1.4'
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  };

  const buttonStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  };

  const updateButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'rgb(100, 30, 150)',
    color: 'white'
  };

  const dismissButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const closeButtonStyle: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    transition: 'color 0.2s ease'
  };

  return (
    <>
      <style jsx>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
      
      <div style={notificationStyle}>
        <div style={headerStyle}>
          <h3 style={titleStyle}>
            <FontAwesomeIcon icon={faDownload} />
            Ny version tillgänglig
          </h3>
          <button
            style={closeButtonStyle}
            onClick={onDismiss}
            onMouseEnter={(e) => e.currentTarget.style.color = 'white'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)'}
          >
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        
        <p style={messageStyle}>
          En ny version av Maestro Quiz är tillgänglig{version && ` (v${version})`}. 
          Uppdatera nu för att få de senaste funktionerna och förbättringarna.
        </p>
        
        <div style={buttonContainerStyle}>
          <button
            style={dismissButtonStyle}
            onClick={onDismiss}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)'}
          >
            Senare
          </button>
          <button
            style={updateButtonStyle}
            onClick={handleUpdate}
            disabled={isUpdating}
            onMouseEnter={(e) => !isUpdating && (e.currentTarget.style.backgroundColor = 'rgb(120, 40, 170)')}
            onMouseLeave={(e) => !isUpdating && (e.currentTarget.style.backgroundColor = 'rgb(100, 30, 150)')}
          >
            {isUpdating ? (
              <>
                <FontAwesomeIcon 
                  icon={faSync} 
                  style={{ animation: 'spin 1s linear infinite' }}
                />
                Uppdaterar...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faDownload} />
                Uppdatera nu
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default UpdateNotification;
