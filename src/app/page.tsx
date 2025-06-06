// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/page.tsx
import React from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface YesterdayWinner {
  name: string;
  score: number;
}

async function getYesterdayWinner(): Promise<YesterdayWinner | null> {
  try {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('leaderboard')
      .select('name, score')
      .eq('quiz_date', yesterday)
      .order('score', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error fetching yesterday winner:', error);
    return null;
  }
}

const HomePage = async () => {
  const yesterdayWinner = await getYesterdayWinner();
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

  const yesterdayWinnerStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    border: '1px solid #FFD700',
    borderRadius: '8px',
    padding: '15px',
    margin: '20px 0',
    fontSize: '16px',
    color: '#FFD700',
    fontWeight: 'bold'
  };

  return (
    <main style={mainStyle}>
      <h1 style={titleStyle}>Välkommen till Maestro Quiz!</h1>
      <p style={descriptionStyle}>
        Testa dina musikkunskaper genom att gissa vilket år låtarna släpptes.
        Utmana dig själv och se hur bra du känner till musikhistorien!
      </p>
      <div style={buttonContainerStyle}>
        <Link href="/quiz" style={primaryButtonStyle}>
          Starta dagens quiz
        </Link>
        <Link href="/instructions" style={secondaryButtonStyle}>
          Hur spelar man?
        </Link>
      </div>
      
      {yesterdayWinner && (
        <div style={yesterdayWinnerStyle}>
          🏆 Gårdagens vinnare: {yesterdayWinner.name} med {yesterdayWinner.score} poäng!
        </div>
      )}
    </main>
  );
};

export default HomePage;