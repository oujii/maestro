'use client';

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import NavigationHeader from '@/components/NavigationHeader';

const InstructionsPage = () => {
  const router = useRouter();
  const [hasPlayedToday, setHasPlayedToday] = useState(false);

  useEffect(() => {
    checkQuizCompletion();
  }, []);

  const checkQuizCompletion = () => {
    try {
      const today = new Date().toLocaleString("en-CA", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).split('T')[0];

      const playedKey = `maestroQuizPlayed_${today}`;
      const hasPlayed = localStorage.getItem(playedKey) !== null;
      setHasPlayedToday(hasPlayed);
    } catch (error) {
      console.error('Error checking quiz completion:', error);
      setHasPlayedToday(false);
    }
  };

  // Styles
  const pageStyle: React.CSSProperties = {
    position: 'relative',
    backgroundColor: 'rgb(20, 16, 44)',
    color: 'white',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  const mainContentStyle: React.CSSProperties = {
    width: '100%',
    maxWidth: '600px',
    textAlign: 'center',
    padding: '20px',
    paddingTop: '30px'
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



  return (
    <div style={pageStyle}>
      <NavigationHeader
        title="Instruktioner"
        backPath="/"
      />
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

        {!hasPlayedToday && (
          <button
            style={buttonStyle}
            onClick={() => router.push('/quiz')}
          >
            Starta Quizet
          </button>
        )}
      </main>
    </div>
  );
};

export default InstructionsPage;
