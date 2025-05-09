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
        const { data, error: fetchError } = await supabase
          .from('leaderboard')
          .select('id, name, score, created_at')
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
  const rankStyle: React.CSSProperties = { marginRight: '15px', color: 'rgba(255,255,255,0.7)', minWidth: '30px' };
  const nameStyle: React.CSSProperties = { flexGrow: 1, textAlign: 'left' };
  const scoreValueStyle: React.CSSProperties = { fontWeight: 'bold', color: 'lightgreen' };
  const buttonStyle: React.CSSProperties = { backgroundColor: 'rgb(100, 30, 150)', color: 'white', border: 'none', padding: '12px 25px', fontSize: '16px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer', marginTop: '30px' };
  const messageStyle: React.CSSProperties = { marginTop: '20px', fontSize: '18px' };

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={logoStyle}>Topplista</div>
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
            {leaderboard.map((entry, index) => (
              <li key={entry.id} style={listItemStyle}>
                <span style={rankStyle}>{index + 1}.</span>
                <span style={nameStyle}>{entry.name}</span>
                <span style={scoreValueStyle}>{entry.score} p</span>
              </li>
            ))}
          </ol>
        ) : null}
        {!loading && !error && leaderboard.length === 0 && ( <p style={messageStyle}>Topplistan är tom för tillfället.</p> )}
        <button style={buttonStyle} onClick={handlePlayQuiz}>Spela Quiz</button>
      </main>
    </div>
  );
};

export default LeaderboardPage;