'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faQuestionCircle } from '@fortawesome/free-solid-svg-icons';

interface NavigationHeaderProps {
  title?: string;
  showBackButton?: boolean;
  showHomeButton?: boolean;
  showInstructions?: boolean;
  showLeaderboard?: boolean;
  backPath?: string;
  customBackAction?: () => void;
  rightContent?: React.ReactNode;
}

const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title = "Maestro",
  showBackButton = true,
  showHomeButton = true,
  showInstructions = true,
  showLeaderboard = true,
  backPath,
  customBackAction,
  rightContent
}) => {
  const router = useRouter();

  const handleBack = () => {
    if (customBackAction) {
      customBackAction();
    } else if (backPath) {
      router.push(backPath);
    } else {
      router.back();
    }
  };

  const handleHome = () => router.push('/');
  const handleInstructions = () => router.push('/instructions');
  const handleLeaderboard = () => router.push('/leaderboard');

  // Styles
  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 20px 0 20px',
    width: '100%',
    maxWidth: '600px',
    margin: '0 auto',
    flexShrink: 0,
    position: 'relative'
  };

  const leftSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    minWidth: '80px'
  };

  const centerSectionStyle: React.CSSProperties = {
    flex: 1,
    textAlign: 'center',
    fontSize: '28px',
    fontWeight: 'bold',
    color: 'white'
  };

  const rightSectionStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    minWidth: '80px',
    justifyContent: 'flex-end'
  };

  const buttonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    textDecoration: 'none'
  };

  const iconButtonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '18px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    textDecoration: 'none'
  };

  const backButtonStyle: React.CSSProperties = {
    ...buttonStyle,
    fontSize: '16px',
    padding: '8px 10px'
  };

  return (
    <header style={headerStyle}>
      {/* Left Section */}
      <div style={leftSectionStyle}>
        {showBackButton && (
          <button
            style={backButtonStyle}
            onClick={handleBack}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ← Tillbaka
          </button>
        )}
        {showHomeButton && (
          <button
            style={iconButtonStyle}
            onClick={handleHome}
            title="Hem"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <FontAwesomeIcon icon={faHome} />
          </button>
        )}
      </div>

      {/* Center Section */}
      <div style={centerSectionStyle}>
        {title}
      </div>

      {/* Right Section */}
      <div style={rightSectionStyle}>
        {rightContent || (
          <>
            {showInstructions && (
              <button
                style={iconButtonStyle}
                onClick={handleInstructions}
                title="Instruktioner"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FontAwesomeIcon icon={faQuestionCircle} />
              </button>
            )}
            {showLeaderboard && (
              <button
                style={iconButtonStyle}
                onClick={handleLeaderboard}
                title="Topplista"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🏆
              </button>
            )}
          </>
        )}
      </div>
    </header>
  );
};

export default NavigationHeader;
