// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/page.tsx
import React from 'react';
import Link from 'next/link';

const HomePage = () => {
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
      </div>
    </main>
  );
};

export default HomePage;