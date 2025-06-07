// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/leaderboard/page.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardEntry {
  id: string;
  name: string;
  score: number;
  created_at?: string;
  quiz_date?: string;
}

const LeaderboardPage = () => {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const handleViewInstructions = () => router.push('/instructions');
  const handlePlayQuiz = () => router.push('/quiz');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true); setError(null);
      try {
        // Använd svensk tidszon för att få rätt datum
        const today = new Date().toLocaleString("en-CA", {
          timeZone: "Europe/Stockholm",
          year: "numeric",
          month: "2-digit", 
          day: "2-digit"
        }); // Format: YYYY-MM-DD
        
        const { data, error: fetchError } = await supabase
          .from('leaderboard')
          .select('id, name, score, created_at, quiz_date')
          .eq('quiz_date', today)
          .order('score', { ascending: false })
          .limit(100);
        if (fetchError) { throw fetchError; }
        if (data) { setLeaderboard(data); }
      } catch (e: any) { console.error('Fel vid hämtning av topplista:', e); setError('Kunde inte ladda topplistan.'); }
      finally { setLoading(false); }
    };
    fetchLeaderboard();
  }, []);

  const pageStyle: React.CSSProperties = { position: 'relative', backgroundColor: 'rgb(20, 16, 44)', color: 'white', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', width: '100%', maxWidth: '600px' };
  const logoStyle: React.CSSProperties = { fontSize: '28px', fontWeight: 'bold' };
  const iconsStyle: React.CSSProperties = { fontSize: '24px', display: 'flex', gap: '15px' };
  const mainContentStyle: React.CSSProperties = { width: '100%', maxWidth: '600px', textAlign: 'center' };
  const listStyle: React.CSSProperties = { listStyleType: 'none', padding: 0, margin: 0 };
  const listItemStyle: React.CSSProperties = { backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '15px 20px', borderRadius: '8px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '18px' };
  const winnerItemStyle: React.CSSProperties = { 
    ...listItemStyle, 
    backgroundColor: 'rgba(255, 215, 0, 0.2)', 
    border: '2px solid #FFD700',
    boxShadow: '0 0 20px rgba(255, 215, 0, 0.5)',
    animation: 'glow 2s ease-in-out infinite alternate',
    position: 'relative' as const
  };
  const rankStyle: React.CSSProperties = { marginRight: '15px', color: 'rgba(255,255,255,0.7)', minWidth: '30px' };
  const winnerRankStyle: React.CSSProperties = { ...rankStyle, color: '#FFD700', fontSize: '20px', fontWeight: 'bold' };
  const nameStyle: React.CSSProperties = { flexGrow: 1, textAlign: 'left' };
  const winnerNameStyle: React.CSSProperties = { ...nameStyle, color: '#FFD700', fontWeight: 'bold' };
  const scoreValueStyle: React.CSSProperties = { fontWeight: 'bold', color: 'lightgreen' };
  const winnerScoreStyle: React.CSSProperties = { ...scoreValueStyle, color: '#FFD700', fontSize: '20px' };
  const buttonStyle: React.CSSProperties = { backgroundColor: 'rgb(100, 30, 150)', color: 'white', border: 'none', padding: '12px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', marginTop: '30px' };
  const messageStyle: React.CSSProperties = { marginTop: '20px', fontSize: '18px' };

  return (
    <>
      <style jsx>{`
        @keyframes glow {
          from {
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          }
          to {
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.8), 0 0 40px rgba(255, 215, 0, 0.6);
          }
        }
      `}</style>
      <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={logoStyle}>Dagens Topplista</div>
        <div style={iconsStyle}>
          <span onClick={handleViewInstructions} style={{cursor: 'pointer'}}>?</span>
          <span style={{cursor: 'pointer'}}>🏆</span>
        </div>
      </header>
      <main style={mainContentStyle}>
        {loading && <p style={messageStyle}>Laddar topplistan...</p>}
        {error && <p style={{...messageStyle, color: 'red'}}>{error}</p>}
        {!loading && !error && leaderboard.length > 0 ? (
          <ol style={listStyle}>
            {leaderboard.map((entry, index) => {
              const isWinner = index === 0;
              return (
                <li key={entry.id} style={isWinner ? winnerItemStyle : listItemStyle}>
                  {isWinner && <span style={{position: 'absolute', left: '-10px', top: '-5px', fontSize: '24px'}}>👑</span>}
                  <span style={isWinner ? winnerRankStyle : rankStyle}>{index + 1}.</span>
                  <span style={isWinner ? winnerNameStyle : nameStyle}>{entry.name}</span>
                  <span style={isWinner ? winnerScoreStyle : scoreValueStyle}>{entry.score} p</span>
                </li>
              );
            })}
          </ol>
        ) : null}
        {!loading && !error && leaderboard.length === 0 && ( <p style={messageStyle}>Topplistan är tom för tillfället.</p> )}
        <button style={buttonStyle} onClick={handlePlayQuiz}>Spela Quiz</button>
      </main>
      </div>
    </>
  );
};

export default LeaderboardPage;