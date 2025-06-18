// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

interface YesterdayWinner {
  name: string;
  score: number;
}

type QuizState = 'not-started' | 'in-progress' | 'completed';

async function getYesterdayWinner(): Promise<YesterdayWinner | null> {
  try {
    // Get current date in Stockholm timezone
    const now = new Date();
    const stockholmTime = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'Europe/Stockholm',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(now);

    // Parse today's date in Stockholm
    const [year, month, day] = stockholmTime.split('-').map(Number);
    const todayInStockholm = new Date(year, month - 1, day);

    // Calculate yesterday
    const yesterdayInStockholm = new Date(todayInStockholm);
    yesterdayInStockholm.setDate(yesterdayInStockholm.getDate() - 1);

    // Format dates as YYYY-MM-DD
    const yesterdayStr = yesterdayInStockholm.toISOString().slice(0, 10);
    const todayStr = todayInStockholm.toISOString().slice(0, 10);

    console.log('=== Yesterday Winner Debug (Stockholm Time) ===');
    console.log('Server time (UTC):', now.toISOString());
    console.log('Stockholm time now:', stockholmTime);
    console.log('Today in Stockholm:', todayStr);
    console.log('Yesterday in Stockholm:', yesterdayStr);
    console.log('Searching for winners on:', yesterdayStr);
    
    const { data, error } = await supabase
      .from('leaderboard')
      .select('name, score, quiz_date')
      .eq('quiz_date', yesterdayStr)
      .order('score', { ascending: false })
      .limit(5); // Hämta fler för debugging
    
    console.log('All results for yesterday:', data);
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    const winner = data && data.length > 0 ? data[0] : null;
    console.log('Selected winner:', winner);
    console.log('==============================');
    
    return winner;
  } catch (error) {
    console.error('Error fetching yesterday winner:', error);
    return null;
  }
}

const HomePage = () => {
  const [yesterdayWinner, setYesterdayWinner] = useState<YesterdayWinner | null>(null);
  const [quizState, setQuizState] = useState<QuizState>('not-started');
  const [isLoading, setIsLoading] = useState(true);
  const [hasResults, setHasResults] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      // Get yesterday's winner
      const winner = await getYesterdayWinner();
      setYesterdayWinner(winner);

      // Check quiz state and results
      const today = new Date().toLocaleString("en-CA", {
        timeZone: "Europe/Stockholm",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).split('T')[0];

      const playedKey = `maestroQuizPlayed_${today}`;
      const progressKey = `maestroQuizProgress_${today}`;

      try {
        // Check if quiz is completed
        if (localStorage.getItem(playedKey)) {
          setQuizState('completed');
        } else {
          // Check if quiz is in progress
          const savedProgress = localStorage.getItem(progressKey);
          if (savedProgress) {
            try {
              const progress = JSON.parse(savedProgress);
              if (progress && typeof progress.currentQuestionIndex === 'number' &&
                  Array.isArray(progress.roundResults) && progress.roundResults.length > 0) {
                setQuizState('in-progress');
              } else {
                setQuizState('not-started');
              }
            } catch (e) {
              setQuizState('not-started');
            }
          } else {
            setQuizState('not-started');
          }
        }

        // Check if user has any results to show
        let foundResults = false;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('maestroQuizPlayed_')) {
            foundResults = true;
            break;
          }
        }
        setHasResults(foundResults);
      } catch (error) {
        console.error('Error checking quiz state:', error);
        setQuizState('not-started');
        setHasResults(false);
      }

      setIsLoading(false);
    };

    fetchData();
  }, []);
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

  const compactButtonStyle: React.CSSProperties = {
    padding: '12px 20px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    boxShadow: '0 2px 5px rgba(0, 0, 0, 0.2)',
    transition: 'all 0.2s ease',
    display: 'block',
    textAlign: 'center',
    flex: 1
  };

  const buttonRowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '10px',
    width: '100%'
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
        {/* Primary Action */}
        {!isLoading && quizState !== 'completed' && (
          <Link href="/quiz" style={primaryButtonStyle}>
            {quizState === 'in-progress' ? 'Fortsätt quiz' : 'Starta dagens quiz'}
          </Link>
        )}
        {quizState === 'completed' && (
          <div style={{
            ...primaryButtonStyle,
            backgroundColor: 'rgba(100, 30, 150, 0.5)',
            cursor: 'not-allowed',
            textDecoration: 'none'
          }}>
            Quiz slutförd för idag
          </div>
        )}

        {/* Secondary Actions */}
        <Link href="/instructions" style={secondaryButtonStyle}>
          Hur spelar man?
        </Link>

        {/* Compact Button Row for Additional Actions */}
        <div style={buttonRowStyle}>
          {quizState === 'completed' && (
            <Link href="/leaderboard" style={compactButtonStyle}>
              Topplista
            </Link>
          )}
          {hasResults && (
            <Link href="/results" style={compactButtonStyle}>
              Visa Resultat
            </Link>
          )}
        </div>
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