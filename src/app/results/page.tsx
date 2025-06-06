// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/results/page.tsx
'use client';

import React, { useEffect, useState, Suspense, useTransition } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { submitScoreAction } from '../actions';
import { getYouTubeFallbackThumbnail, searchDeezerTrack, getDeezerAlbumCover } from '../../utils/deezer';

interface RoundResult {
  questionId: string;
  title: string;
  artist: string;
  youtubeVideoId: string; // Changed from imageUrl to youtubeVideoId
  correctYear: number;
  guessedYear: number;
  points: number;
  yearDifference: number;
}

const ResultsContent = () => {
  const router = useRouter();
  const [score, setScore] = useState<number | null>(null);
  const [avgDeviation, setAvgDeviation] = useState<number | null>(null);
  const [roundRecaps, setRoundRecaps] = useState<RoundResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorLoading, setErrorLoading] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [playerName, setPlayerName] = useState<string>('');
  const [isPending, startTransition] = React.useTransition();
  const [submitMessage, setSubmitMessage] = useState<string>('');
  const [deezerTracks, setDeezerTracks] = useState<Record<string, any>>({});

  useEffect(() => {
    setIsLoading(true); setErrorLoading(null);
    try {
      const resultsKey = `maestroLastQuizResults`;
      const storedResults = localStorage.getItem(resultsKey);
      if (storedResults) {
        const parsedResults = JSON.parse(storedResults);
        if (parsedResults && typeof parsedResults.score === 'number' && Array.isArray(parsedResults.rounds)) {
          setScore(parsedResults.score); setRoundRecaps(parsedResults.rounds);
          if (parsedResults.rounds.length > 0) { const totalDeviation = parsedResults.rounds.reduce((sum: number, round: RoundResult) => sum + round.yearDifference, 0); setAvgDeviation(Math.round((totalDeviation / parsedResults.rounds.length) * 10) / 10); }
          else { setAvgDeviation(0); }
          // Optional: localStorage.removeItem(resultsKey);
        } else { throw new Error("Ogiltigt format på sparade resultat."); }
      } else { throw new Error("Inga resultat hittades i localStorage."); }
    } catch (e: any) { console.error("Fel vid hämtning/tolkning av resultat:", e); setErrorLoading("Kunde inte ladda dina quizresultat."); setScore(null); setRoundRecaps([]); setAvgDeviation(null); }
    finally { setIsLoading(false); }
  }, []); // Kör bara på mount

  // Hämta Deezer-data för varje låt
  useEffect(() => {
    const fetchDeezerData = async () => {
      if (roundRecaps.length === 0) return;

      // Skapa en kopia av deezerTracks för att uppdatera
      const updatedDeezerTracks = { ...deezerTracks };
      let hasNewData = false;

      // Hämta data för varje låt som inte redan finns i cache
      for (const round of roundRecaps) {
        if (!updatedDeezerTracks[round.questionId]) {
          try {
            const deezerTrack = await searchDeezerTrack(
              round.artist,
              round.title,
              round.youtubeVideoId
            );

            if (deezerTrack) {
              updatedDeezerTracks[round.questionId] = deezerTrack;
              hasNewData = true;
            }
          } catch (error) {
            console.error(`Error fetching Deezer data for ${round.title}:`, error);
          }
        }
      }

      // Uppdatera state endast om vi har ny data
      if (hasNewData) {
        setDeezerTracks(updatedDeezerTracks);
      }
    };

    fetchDeezerData();
  }, [roundRecaps]);

  const handleShare = () => {
    const shareText = `Jag fick ${score} poäng i dagens Maestro Quiz! Kan du slå mig? ${window.location.origin}`;
    
    if (navigator.share) {
      // För iOS: inkludera URL i texten för att säkerställa att meddelandet inkluderas
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      
      if (isIOS) {
        // På iOS, använd bara text med URL inkluderad för att få med meddelandet
        navigator.share({
          text: shareText
        }).then(() => console.log('Resultat delat!')).catch((error) => console.error('Fel vid delning:', error));
      } else {
        // På Android och andra enheter, använd separata text och url fält
        navigator.share({
          title: 'Maestro Quiz Resultat',
          text: `Jag fick ${score} poäng i dagens Maestro Quiz! Kan du slå mig?`,
          url: window.location.origin,
        }).then(() => console.log('Resultat delat!')).catch((error) => console.error('Fel vid delning:', error));
      }
    } else {
      // Fallback för webbläsare som inte stöder Web Share API
      if (navigator.clipboard) {
        navigator.clipboard.writeText(shareText).then(() => {
          alert('Resultatet har kopierats till urklipp!');
        }).catch(() => {
          alert(`Kopiera detta meddelande:\n\n${shareText}`);
        });
      } else {
        alert(`Kopiera detta meddelande:\n\n${shareText}`);
      }
    }
  };
  const openSubmitModal = () => { setIsModalOpen(true); setSubmitMessage(''); };
  const closeSubmitModal = () => { setIsModalOpen(false); setPlayerName(''); };
  const handleViewInstructions = () => router.push('/instructions');
  const handleViewLeaderboard = () => router.push('/leaderboard');
  const handleSubmitToLeaderboard = async () => {
    if (!playerName.trim() || score === null) {
      setSubmitMessage('Vänligen ange ett namn och se till att poäng finns.');
      return;
    }
    setSubmitMessage('');
    startTransition(async () => {
      const result = await submitScoreAction(playerName.trim(), score);
      setSubmitMessage(result.message);
      if (result.success) {
        setTimeout(() => {
          closeSubmitModal();
          // Ta bort omdirigeringen till leaderboard
          // Stäng bara modalen och stanna kvar på resultatvyn
        }, 2000);
      }
    });
  };

  const pageStyle: React.CSSProperties = { position: 'relative', backgroundColor: 'rgb(20, 16, 44)', color: 'white', minHeight: '100vh', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', width: '100%', maxWidth: '600px' };
  const logoStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 'bold' };
  const iconsStyle: React.CSSProperties = { fontSize: '24px', display: 'flex', gap: '15px' };
  const mainContentStyle: React.CSSProperties = { width: '100%', maxWidth: '600px', textAlign: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: '30px', borderRadius: '15px' };
  const titleStyle: React.CSSProperties = { fontSize: '28px', fontWeight: 'bold', marginBottom: '20px' };
  const summaryContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-around', marginBottom: '30px', flexWrap: 'wrap', gap: '15px' };
  const summaryBoxStyle: React.CSSProperties = { textAlign: 'center' };
  const summaryLabelStyle: React.CSSProperties = { fontSize: '16px', color: 'rgba(255,255,255,0.8)', marginBottom: '5px', textTransform: 'uppercase' };
  const summaryValueStyle: React.CSSProperties = { fontSize: '32px', fontWeight: 'bold' };
  const scoreValueStyle: React.CSSProperties = { ...summaryValueStyle, color: 'lightgreen' };
  const deviationValueStyle: React.CSSProperties = { ...summaryValueStyle, color: 'white' };
  const recapTitleStyle: React.CSSProperties = { fontSize: '20px', fontWeight: 'bold', marginBottom: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '20px', marginTop:'20px' };
  const recapListStyle: React.CSSProperties = { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '15px' };
  const recapItemStyle: React.CSSProperties = { backgroundColor: 'rgba(0,0,0,0.2)', padding: '15px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '15px' };
  const recapImageStyle: React.CSSProperties = { width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' };
  const recapInfoStyle: React.CSSProperties = { flexGrow: 1, textAlign: 'left' };
  const recapDetailStyle: React.CSSProperties = { fontSize: '14px', marginBottom: '5px' };
  const recapPointsStyle: React.CSSProperties = { fontSize: '18px', fontWeight: 'bold', color: 'lightgreen', marginLeft: 'auto', textAlign: 'right' };
  const buttonContainerStyle: React.CSSProperties = { marginTop: '30px', display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', maxWidth: '400px', margin: '30px auto 0 auto' };
  const buttonStyle: React.CSSProperties = { backgroundColor: 'rgb(100, 30, 150)', color: 'white', border: 'none', padding: '15px 0', width: '100%', fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' };
  const modalOverlayStyle: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
  const modalContentStyle: React.CSSProperties = { backgroundColor: 'rgb(30, 20, 54)', padding: '30px', borderRadius: '10px', width: '90%', maxWidth: '400px', textAlign: 'center', position: 'relative' };
  const modalTitleStyle: React.CSSProperties = { fontSize: '22px', marginBottom: '20px', color: 'white' };
  const modalInputStyle: React.CSSProperties = { width: '100%', padding: '12px', marginBottom: '20px', borderRadius: '5px', border: '1px solid rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.1)', color: 'white', fontSize: '16px' };
  const modalButtonStyle: React.CSSProperties = { ...buttonStyle, fontSize: '16px', padding: '12px 0', width: '48%', display: 'inline-block' };
  const modalButtonContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '10px' };
  const modalCloseButtonStyle: React.CSSProperties = { position: 'absolute', top: '10px', right: '15px', background: 'none', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' };
  const modalMessageStyle: React.CSSProperties = { marginTop: '15px', fontSize: '14px', minHeight: '20px' };


  if (isLoading) return <div style={pageStyle}><p>Laddar resultat...</p></div>;
  if (errorLoading) return <div style={pageStyle}><p style={{color:'red'}}>{errorLoading}</p></div>;
  if (score === null) return <div style={pageStyle}><p>Inga resultat att visa.</p></div>;

  return (
    <div style={pageStyle}>
      <header style={headerStyle}>
        <div style={logoStyle}>Maestro</div>
        <div style={iconsStyle}>
          <span onClick={handleViewInstructions} style={{cursor: 'pointer'}}>?</span>
          <span onClick={handleViewLeaderboard} style={{cursor: 'pointer'}}>🏆</span>
        </div>
      </header>
      <main style={mainContentStyle}>
        <h1 style={titleStyle}>Ditt Resultat</h1>
        <div style={summaryContainerStyle}>
            <div style={summaryBoxStyle}> <p style={summaryLabelStyle}>Totalpoäng</p> <p style={scoreValueStyle}>{score}</p> </div>
            {avgDeviation !== null && ( <div style={summaryBoxStyle}> <p style={summaryLabelStyle}>Snittavvikelse</p> <p style={deviationValueStyle}>{avgDeviation} år</p> </div> )}
        </div>
        {roundRecaps.length > 0 && (
            <div>
                <h2 style={recapTitleStyle}>Resultat</h2>
                <ul style={recapListStyle}>
                    {roundRecaps.map((round, index) => (
                        <li key={round.questionId || index} style={recapItemStyle}>
                            <img
                              src={deezerTracks[round.questionId]
                                ? getDeezerAlbumCover(deezerTracks[round.questionId], 'big')
                                : getYouTubeFallbackThumbnail(round.youtubeVideoId, 'high')}
                              alt={`Album cover for ${round.title}`}
                              style={recapImageStyle}
                            />
                            <div style={recapInfoStyle}> <p style={{...recapDetailStyle, fontWeight:'bold'}}>Runda {index + 1}: {round.title}</p> <p style={recapDetailStyle}>Rätt: {round.correctYear} | Din gissning: {round.guessedYear}</p> </div>
                            <span style={recapPointsStyle}>+{round.points}p</span>
                        </li>
                    ))}
                </ul>
            </div>
        )}
        <div style={buttonContainerStyle}>
          <button style={buttonStyle} onClick={handleShare}>Dela Resultat</button>
          <button style={buttonStyle} onClick={openSubmitModal}>Skicka till Topplistan</button>
        </div>
      </main>
      {isModalOpen && ( /* Modal JSX */ <div style={modalOverlayStyle} onClick={closeSubmitModal}> <div style={modalContentStyle} onClick={(e) => e.stopPropagation()}> <button style={modalCloseButtonStyle} onClick={closeSubmitModal} disabled={isPending}>&times;</button> <h2 style={modalTitleStyle}>Skicka till Topplistan</h2> <input type="text" placeholder="Ditt namn" value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={30} style={modalInputStyle} disabled={isPending} /> <div style={modalButtonContainerStyle}> <button style={{...modalButtonStyle, backgroundColor: 'grey'}} onClick={closeSubmitModal} disabled={isPending}> Avbryt </button> <button style={modalButtonStyle} onClick={handleSubmitToLeaderboard} disabled={isPending || !playerName.trim()}> {isPending ? 'Skickar...' : 'Skicka'} </button> </div> {submitMessage && <p style={{...modalMessageStyle, color: submitMessage.includes('Kunde inte') ? 'red' : 'lightgreen'}}>{submitMessage}</p>} </div> </div> )}
    </div>
  );
};

const ResultsPage = () => ( <Suspense fallback={<div>Laddar...</div>}> <ResultsContent /> </Suspense> );
export default ResultsPage;