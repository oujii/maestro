'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const InstructionsPage = () => {
  const router = useRouter();

  // Styles
  const pageStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: 'rgb(20, 16, 44)',
    color: 'white',
    minHeight: '100vh',
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: '30px',
    width: '100%',
    maxWidth: '600px',
    position: 'relative'
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    textAlign: 'center'
  };

  const mainContentStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    textAlign: 'center'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '20px'
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
    textAlign: 'left'
  };

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: 'rgb(180, 130, 230)'
  };

  const paragraphStyle: React.CSSProperties = {
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '15px'
  };

  const listStyle: React.CSSProperties = {
    paddingLeft: '20px',
    marginBottom: '15px'
  };

  const listItemStyle: React.CSSProperties = {
    fontSize: '16px',
    lineHeight: '1.6',
    marginBottom: '8px'
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'rgb(100, 30, 150)',
    color: 'white',
    border: 'none',
    padding: '15px 30px',
    fontSize: '18px',
    fontWeight: 'bold',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '20px',
    textDecoration: 'none',
    display: 'inline-block'
  };

  const backLinkStyle: React.CSSProperties = {
    color: 'rgba(255, 255, 255, 0.7)',
    textDecoration: 'none',
    marginTop: '20px',
    display: 'inline-block',
    fontSize: '16px'
  };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={logoStyle}>Maestro Quiz</div>
      </header>
      <main style={mainContentStyle}>
        <h1 style={titleStyle}>Hur man spelar</h1>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Spelets mål</h2>
          <p style={paragraphStyle}>
            Maestro Quiz utmanar din kunskap om musikhistoria. Lyssna på låtar och gissa vilket år de släpptes.
            Ju närmare du kommer det korrekta året, desto fler poäng får du!
          </p>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Spelregler</h2>
          <ul style={listStyle}>
            <li style={listItemStyle}>Varje dag finns ett nytt quiz med 4 låtar</li>
            <li style={listItemStyle}>Lyssna på låten och gissa vilket år den släpptes</li>
            <li style={listItemStyle}>Använd sifferinmatningen eller skjutreglaget för att välja år</li>
            <li style={listItemStyle}>Klicka på "GISSA" för att lämna ditt svar</li>
            <li style={listItemStyle}>Du får poäng baserat på hur nära du kommer det rätta året</li>
          </ul>
        </div>

        <div style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Poängsystem</h2>
          <ul style={listStyle}>
            <li style={listItemStyle}><strong>Exakt rätt år:</strong> 1000 poäng</li>
            <li style={listItemStyle}><strong>1-2 års skillnad:</strong> 500 poäng</li>
            <li style={listItemStyle}><strong>3-5 års skillnad:</strong> 100-250 poäng</li>
            <li style={listItemStyle}><strong>6-10 års skillnad:</strong> 0-100 poäng</li>
            <li style={listItemStyle}><strong>Mer än 10 års skillnad:</strong> 0 poäng</li>
          </ul>
        </div>

        <button
          style={buttonStyle}
          onClick={() => router.push('/quiz')}
        >
          Starta Quizet
        </button>

        <div style={{marginTop: '20px'}}>
          <Link href="/" style={backLinkStyle}>
            ← Tillbaka till startsidan
          </Link>
        </div>
      </main>
    </div>
  );
};

export default InstructionsPage;
