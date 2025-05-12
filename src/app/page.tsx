// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/page.tsx
'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

const HomePage = () => {
  const [autoPlayMusic, setAutoPlayMusic] = useState<boolean>(true);

  // Läs inställningen från localStorage när komponenten laddas
  useEffect(() => {
    try {
      const savedAutoPlay = localStorage.getItem('maestroAutoPlayMusic');
      if (savedAutoPlay !== null) {
        setAutoPlayMusic(savedAutoPlay === 'true');
      }
    } catch (error) {
      console.error("Error reading autoplay setting from localStorage:", error);
    }
  }, []);

  // Spara inställningen till localStorage när den ändras
  const handleAutoPlayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked;
    setAutoPlayMusic(newValue);
    try {
      localStorage.setItem('maestroAutoPlayMusic', newValue.toString());
      console.log("Saved autoplay setting:", newValue);
    } catch (error) {
      console.error("Error saving autoplay setting to localStorage:", error);
    }
  };
  // Styles
  const mainStyle: React.CSSProperties = {
    padding: '20px',
    textAlign: 'center',
    backgroundColor: 'rgb(20, 16, 44)',
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '38px',
    marginBottom: '15px',
    background: 'linear-gradient(45deg, #b48ee6, #6e30c9)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 2px 10px rgba(110, 48, 201, 0.3)'
  };

  const descriptionStyle: React.CSSProperties = {
    fontSize: '18px',
    marginBottom: '40px',
    maxWidth: '500px',
    lineHeight: '1.6'
  };

  const buttonContainerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
    width: '100%',
    maxWidth: '300px'
  };

  const primaryButtonStyle: React.CSSProperties = {
    padding: '15px 30px',
    backgroundColor: 'rgb(100, 30, 150)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '18px',
    fontWeight: 'bold',
    border: 'none',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
    display: 'block',
    textAlign: 'center'
  };

  const secondaryButtonStyle: React.CSSProperties = {
    ...primaryButtonStyle,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.2)'
  };

  const checkboxContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '20px',
    gap: '10px'
  };

  const checkboxLabelStyle: React.CSSProperties = {
    fontSize: '16px',
    color: 'rgba(255, 255, 255, 0.8)'
  };

  const checkboxStyle: React.CSSProperties = {
    width: '18px',
    height: '18px',
    accentColor: 'rgb(100, 30, 150)'
  };

  return (
    <main style={mainStyle}>
      <h1 style={titleStyle}>Välkommen till Maestro Quiz!</h1>
      <p style={descriptionStyle}>
        Testa dina musikkunskaper genom att gissa vilket år låtarna släpptes.
        Utmana dig själv och se hur bra du känner till musikhistorien!
      </p>
      <div style={buttonContainerStyle}>
        <Link href="/instructions" style={primaryButtonStyle}>
          Hur man spelar
        </Link>
        <Link href="/quiz" style={secondaryButtonStyle}>
          Starta dagens quiz
        </Link>

        <div style={checkboxContainerStyle}>
          <input
            type="checkbox"
            id="autoPlayMusic"
            checked={autoPlayMusic}
            onChange={handleAutoPlayChange}
            style={checkboxStyle}
          />
          <label htmlFor="autoPlayMusic" style={checkboxLabelStyle}>
            Försök spela musik automatiskt (kräver användarinteraktion i vissa webbläsare)
          </label>
        </div>
      </div>
    </main>
  );
};

export default HomePage;