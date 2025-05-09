// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/quiz/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Confetti from 'react-confetti';
import YouTube from 'react-youtube';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MobileSlider from '../../components/MobileSlider';
import { getYouTubeThumbnailUrl } from '../../utils/youtube';

interface Question {
  id: string;
  title: string;
  artist: string;
  correct_year: number;
  youtube_video_id: string;
  trivia: string;
  quiz_date?: string;
  // image_url is no longer needed as we'll use YouTube thumbnails
}

interface RoundResult {
  questionId: string;
  title: string;
  artist: string;
  youtubeVideoId: string; // Store YouTube video ID instead of image URL
  correctYear: number;
  guessedYear: number;
  points: number;
  yearDifference: number;
}

const calculateTimelinePosition = (year: number, minYear: number, maxYear: number) => {
  const totalRange = maxYear - minYear; if (totalRange === 0) return '0%';
  const yearOffset = year - minYear; return `${(yearOffset / totalRange) * 100}%`;
};

const QuizPage = () => {
  const router = useRouter();
  const currentUiYear = new Date().getFullYear(); const MIN_YEAR = 1900; const MAX_YEAR = currentUiYear;

  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [selectedYear, setSelectedYear] = useState<number | null>(1960); // Sätt ett initialt värde i mitten av tidslinjen
  const [yearDigits, setYearDigits] = useState<string[]>(['', '', '', '']);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  type GameState = 'loading' | 'preparing' | 'guessing' | 'feedback' | 'quizOver' | 'alreadyPlayed' | 'noQuestions' | 'errorFetching';
  const [gameState, setGameState] = useState<GameState>('loading');
  const [userGuessFeedback, setUserGuessFeedback] = useState<{ guessedYear: number; isCorrect: boolean; yearDifference: number; points: number; } | null>(null);
  const [score, setScore] = useState<number>(0);
  const [isYouTubeReady, setIsYouTubeReady] = useState<boolean>(false);
  const [isYouTubePlaying, setIsYouTubePlaying] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [hasInteractedWithSlider, setHasInteractedWithSlider] = useState<boolean>(false);

  const playerRef = useRef<any>(null);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const playedKey = `maestroQuizPlayed_${today}`;
    const progressKey = `maestroQuizProgress_${today}`;

    const initializeQuiz = async () => {
      // Check if quiz is fully completed
      if (localStorage.getItem(playedKey)) {
        setGameState('alreadyPlayed');
        return;
      }

      try {
        const { data, error } = await supabase.from('questions').select('id, title, artist, correct_year, youtube_video_id, trivia').eq('quiz_date', today).limit(4);
        if (error) throw error;
        if (data && data.length > 0) {
          setAllQuestions(data);

          // Check for saved progress
          const savedProgress = localStorage.getItem(progressKey);
          if (savedProgress) {
            try {
              const progress = JSON.parse(savedProgress);
              if (progress && typeof progress.currentQuestionIndex === 'number' &&
                  progress.currentQuestionIndex >= 0 &&
                  progress.currentQuestionIndex < data.length &&
                  Array.isArray(progress.roundResults)) {

                // Restore progress
                setCurrentQuestionIndex(progress.currentQuestionIndex);
                setRoundResults(progress.roundResults);
                setScore(progress.score || 0);

                // If we're resuming in the middle, go straight to guessing state
                setGameState('preparing');
              } else {
                // Invalid progress data, start fresh
                setGameState('preparing');
              }
            } catch (e) {
              console.error('Error parsing saved progress:', e);
              setGameState('preparing');
            }
          } else {
            // No saved progress, start fresh
            setGameState('preparing');
          }
        }
        else { setGameState('noQuestions'); }
      } catch (e) { console.error('Fel vid hämtning av frågor:', e); setGameState('errorFetching'); }
    };

    initializeQuiz();
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize); handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (selectedYear !== null) {
      const yearStr = selectedYear.toString().padStart(4, '0');
      setYearDigits(yearStr.split(''));
    }
  }, [selectedYear]);

  useEffect(() => {
    if ((gameState === 'preparing' || gameState === 'guessing') && allQuestions.length > 0 && currentQuestionIndex < allQuestions.length) {
      setCurrentQuestion(allQuestions[currentQuestionIndex]);
      // Sätt ett initialt värde i mitten av tidslinjen
      setSelectedYear(1960);
      setYearDigits(['', '', '', '']);
      setUserGuessFeedback(null);
      setShowConfetti(false);
      setIsYouTubeReady(false);
      setIsYouTubePlaying(false);
      setHasInteractedWithSlider(false);

      // Reset player state when changing questions
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        try {
          playerRef.current.stopVideo();
        } catch (error) {
          console.error("Error stopping YouTube video:", error);
        }
      }
    }
  }, [currentQuestionIndex, allQuestions, gameState]);

  const handleSliderChange = (newValue: number) => {
    if (!hasInteractedWithSlider) {
      setHasInteractedWithSlider(true);
    }
    setSelectedYear(newValue);
  };
  const handleDigitInputChange = (index: number, value: string) => {
    if (/^\d*$/.test(value) && value.length <= 1) {
      if (!hasInteractedWithSlider) {
        setHasInteractedWithSlider(true);
      }

      const newDigits = [...yearDigits];
      newDigits[index] = value;
      setYearDigits(newDigits);

      const newYearString = newDigits.join('');
      if (newYearString.length === 4 && !newYearString.includes('')) {
        let numYear = parseInt(newYearString, 10);
        if (numYear < MIN_YEAR) numYear = MIN_YEAR;
        if (numYear > MAX_YEAR) numYear = MAX_YEAR;
        setSelectedYear(numYear);
      }

      if (value && index < 3) inputRefs[index + 1].current?.focus();
    }
  };
  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => { if (event.key === 'Backspace' && yearDigits[index] === '') { if (index > 0) inputRefs[index - 1].current?.focus(); } else if (event.key === 'ArrowLeft' && index > 0) { inputRefs[index - 1].current?.focus(); } else if (event.key === 'ArrowRight' && index < 3) { inputRefs[index + 1].current?.focus(); } };

  const handleGuess = () => {
    if (!currentQuestion) return;

    try {
      // Safely pause the video if player exists and is ready
      if (playerRef.current && typeof playerRef.current.pauseVideo === 'function') {
        playerRef.current.pauseVideo();
      }
    } catch (error) {
      console.error("Error pausing YouTube video:", error);
      // Continue with the function even if there's an error with the player
    }

    const finalYearGuess = parseInt(yearDigits.join(''), 10);
    if (isNaN(finalYearGuess) || yearDigits.join('').length !== 4) {
      console.log("Ogiltigt år.");
      return;
    }

    const isCorrect = finalYearGuess === currentQuestion.correct_year;
    const yearDifference = Math.abs(finalYearGuess - currentQuestion.correct_year);
    let pointsAwarded = 0;

    if (isCorrect) {
      pointsAwarded = 1000;
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    } else if (yearDifference <= 2) {
      pointsAwarded = 500;
    } else if (yearDifference <= 5) {
      pointsAwarded = 250 - (yearDifference - 3) * 50;
    } else if (yearDifference <= 10) {
      pointsAwarded = 100 - (yearDifference - 6) * 20;
    }

    pointsAwarded = Math.max(0, pointsAwarded);

    const currentRoundResult: RoundResult = {
      questionId: currentQuestion.id,
      title: currentQuestion.title,
      artist: currentQuestion.artist,
      youtubeVideoId: currentQuestion.youtube_video_id,
      correctYear: currentQuestion.correct_year,
      guessedYear: finalYearGuess,
      points: pointsAwarded,
      yearDifference: yearDifference
    };

    const newResults = [...roundResults, currentRoundResult];
    const newTotalScore = score + pointsAwarded;

    // Save progress to localStorage
    const today = new Date().toISOString().split('T')[0];
    const progressKey = `maestroQuizProgress_${today}`;
    try {
      localStorage.setItem(progressKey, JSON.stringify({
        currentQuestionIndex,
        roundResults: newResults,
        score: newTotalScore
      }));
    } catch (e) {
      console.error("Could not save progress to localStorage:", e);
    }

    setRoundResults(newResults);
    setScore(newTotalScore);
    setUserGuessFeedback({
      guessedYear: finalYearGuess,
      isCorrect,
      yearDifference,
      points: pointsAwarded
    });

    // Small delay to ensure state updates are complete before changing game state
    setTimeout(() => {
      setGameState('feedback');
    }, 100);
  };

  const handleNextSong = () => {
    try {
      // Safely stop the video if player exists and is ready
      if (playerRef.current && typeof playerRef.current.stopVideo === 'function') {
        playerRef.current.stopVideo();
      }
    } catch (error) {
      console.error("Error stopping YouTube video:", error);
      // Continue with the function even if there's an error with the player
    }

    const today = new Date().toISOString().split('T')[0];
    const playedKey = `maestroQuizPlayed_${today}`;
    const progressKey = `maestroQuizProgress_${today}`;
    const resultsKey = `maestroLastQuizResults`;

    if (currentQuestionIndex < allQuestions.length - 1) {
      // Move to next question
      const nextQuestionIndex = currentQuestionIndex + 1;

      // Update progress in localStorage
      try {
        localStorage.setItem(progressKey, JSON.stringify({
          currentQuestionIndex: nextQuestionIndex,
          roundResults,
          score
        }));
      } catch (e) {
        console.error("Could not save progress to localStorage:", e);
      }

      setGameState('guessing');
      setCurrentQuestionIndex(nextQuestionIndex);
    } else {
      // Quiz is complete
      try {
        // Mark quiz as completed
        localStorage.setItem(playedKey, 'true');
        // Remove progress since quiz is complete
        localStorage.removeItem(progressKey);
        // Save final results
        localStorage.setItem(resultsKey, JSON.stringify({ score: score, rounds: roundResults }));
      } catch (e) {
        console.error("Kunde inte spara resultat till localStorage:", e);
      } finally {
        setGameState('quizOver');
        router.push(`/results`);
      }
    }
  };

  const handleViewLeaderboard = () => router.push('/leaderboard');
  const handleViewInstructions = () => router.push('/instructions');

  const onPlayerReady = (event: any) => {
    try {
      playerRef.current = event.target;
      setIsYouTubeReady(true);

      // Start playing the video when it's ready
      if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
        // Try to unmute first (important for autoplay)
        if (typeof playerRef.current.unMute === 'function') {
          playerRef.current.unMute();
        }

        // Set volume to high
        if (typeof playerRef.current.setVolume === 'function') {
          playerRef.current.setVolume(100);
        }

        // Try to play the video
        playerRef.current.playVideo();

        // Check if video is actually playing
        const checkPlayingInterval = setInterval(() => {
          if (!playerRef.current) {
            clearInterval(checkPlayingInterval);
            return;
          }

          if (typeof playerRef.current.getPlayerState === 'function') {
            const playerState = playerRef.current.getPlayerState();

            // If video is playing (state 1) hehe
            if (playerState === 1) {
              setIsYouTubePlaying(true);

              // If we're in preparing state, move to guessing state
              if (gameState === 'preparing') {
                setGameState('guessing');
                if (inputRefs[0].current) inputRefs[0].current.focus();
              }

              clearInterval(checkPlayingInterval);
            }
            // If video is paused, cued, or buffering, try to play again
            else if (playerState === 2 || playerState === 5 || playerState === 3) {
              if (typeof playerRef.current.playVideo === 'function') {
                playerRef.current.playVideo();
              }
            }
            // If there's an error (state -1), move to guessing state after a delay
            else if (playerState === -1) {
              console.warn("YouTube player error state detected");
              if (gameState === 'preparing') {
                setTimeout(() => {
                  setGameState('guessing');
                  if (inputRefs[0].current) inputRefs[0].current.focus();
                }, 1000);
              }
              clearInterval(checkPlayingInterval);
            }
          }
        }, 300);

        // Clear interval after 10 seconds to prevent memory leaks
        // Also move to guessing state if still in preparing after timeout
        setTimeout(() => {
          clearInterval(checkPlayingInterval);
          if (gameState === 'preparing') {
            console.warn("Timeout waiting for YouTube player, moving to guessing state");
            setGameState('guessing');
            if (inputRefs[0].current) inputRefs[0].current.focus();
          }
        }, 5000);
      }
    } catch (error) {
      console.error("Error initializing YouTube player:", error);
      // If there's an error, still move to guessing state after a delay
      if (gameState === 'preparing') {
        setTimeout(() => {
          setGameState('guessing');
          if (inputRefs[0].current) inputRefs[0].current.focus();
        }, 1000);
      }
    }
  };

  const pageStyle: React.CSSProperties = { position: 'relative', backgroundColor: 'rgb(20, 16, 44)', color: 'white', minHeight: '100vh', padding: '20px', overflow: 'hidden', display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', width: '100%', maxWidth: '600px' };
  const logoStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 'bold' };
  const scoreStyle: React.CSSProperties = { fontSize: '18px' };
  const iconsStyle: React.CSSProperties = { fontSize: '24px', display: 'flex', gap: '15px' };
  const mainContentStyle: React.CSSProperties = { width: '100%', maxWidth: '450px', textAlign: 'center' };
  const questionProgressStyle: React.CSSProperties = { textAlign: 'left', fontSize: '16px', marginBottom: '15px', color: 'rgba(255, 255, 255, 0.8)' };
  const artworkContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', marginBottom: '10px' };
  const artworkStyle: React.CSSProperties = { width: '80%', maxWidth: '300px', height: 'auto', borderRadius: '15px', objectFit: 'cover' };
  const songInfoStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '20px' };
  const songTitleStyle: React.CSSProperties = { fontSize: '22px', fontWeight: 'bold', marginBottom: '5px' };
  const artistNameStyle: React.CSSProperties = { fontSize: '16px', color: 'rgba(255, 255, 255, 0.8)' };
  const guessSectionStyle: React.CSSProperties = { textAlign: 'center' };
  const questionTextStyle: React.CSSProperties = { fontSize: '18px', marginBottom: '20px' };
  const yearInputsContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '10px',
    marginBottom: '35px'
  };
  const yearInputStyle: React.CSSProperties = { width: '50px', height: '60px', textAlign: 'center', fontSize: '28px', fontWeight: 'bold', backgroundColor: 'rgba(100, 30, 150, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white' };
  const sliderContainerStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', width: '100%', maxWidth: '400px', margin: '0 auto 30px auto', color: 'rgba(255, 255, 255, 0.7)' };
  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'rgb(100, 30, 150)',
    color: 'white',
    border: 'none',
    padding: '15px 0',
    width: '100%',
    maxWidth: '400px',
    fontSize: '20px',
    fontWeight: 'bold',
    borderRadius: '8px',
    cursor: 'pointer',
    marginTop: '20px',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.3)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  };

  const triviaBubbleStyle: React.CSSProperties = { backgroundColor: 'rgba(255, 255, 255, 0.1)', padding: '15px', borderRadius: '10px', margin: '20px auto', maxWidth: '400px', fontSize: '14px', lineHeight: '1.6', fontStyle: 'italic' };
  const timelineWrapperStyle: React.CSSProperties = { width: '100%', maxWidth: '400px', margin: '-20px auto', padding: '20px 0' };
  const centeredMessageStyle : React.CSSProperties = { textAlign: 'center', marginTop: '50px', fontSize: '18px' };

  if (gameState === 'loading') return <div style={pageStyle}><p style={centeredMessageStyle}>Laddar quiz...</p></div>;
  if (gameState === 'alreadyPlayed') { return ( <div style={pageStyle}> <header style={headerStyle}><div style={logoStyle}>Maestro</div><div style={scoreStyle}></div><div style={iconsStyle}><span onClick={handleViewInstructions} style={{cursor: 'pointer'}}>?</span><span onClick={handleViewLeaderboard} style={{cursor: 'pointer'}}>🏆</span></div></header> <main style={mainContentStyle}> <div style={centeredMessageStyle}> <h2 style={{...songTitleStyle, fontSize: '28px', marginBottom: '15px'}}>Redan spelat idag!</h2> <p style={{fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginBottom: '30px' }}>Du har redan spelat dagens quiz. Välkommen tillbaka imorgon för nya utmaningar!</p> <button style={buttonStyle} onClick={handleViewLeaderboard}>Visa Leaderboard</button> </div> </main> </div> ); }
  if (gameState === 'noQuestions') return <div style={pageStyle}><p style={centeredMessageStyle}>Inga frågor hittades för dagens quiz. Försök igen imorgon!</p></div>;
  if (gameState === 'errorFetching') return <div style={pageStyle}><p style={{...centeredMessageStyle, color: 'red'}}>Kunde inte ladda frågor. Kontrollera din anslutning och försök igen.</p></div>;
  if (!currentQuestion) return <div style={pageStyle}><p style={centeredMessageStyle}>Väntar på fråga...</p></div>;

  return (
     <div style={pageStyle}>
       {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} />}
       {(gameState === 'preparing' || gameState === 'guessing') && currentQuestion && currentQuestion.youtube_video_id && (
         <div style={{
           position: 'absolute',
           bottom: '0',
           right: '0',
           opacity: 0,
           pointerEvents: 'none',
           width: '1px',
           height: '1px',
           overflow: 'hidden'
         }}>
           <YouTube
             videoId={currentQuestion.youtube_video_id}
             opts={{
               height: '1',
               width: '1',
               playerVars: {
                 autoplay: 1,
                 controls: 0,
                 showinfo: 0,
                 rel: 0,
                 modestbranding: 1,
                 origin: window.location.origin,
                 enablejsapi: 1,
                 mute: 0, // Ensure not muted
                 playsinline: 1 // Important for mobile
               }
             }}
             onReady={onPlayerReady}
             onStateChange={(event) => {
               // Check if video is playing (state 1)
               if (event.data === 1) {
                 setIsYouTubePlaying(true);
                 // If we're in preparing state, move to guessing state
                 if (gameState === 'preparing') {
                   setGameState('guessing');
                   if (inputRefs[0].current) inputRefs[0].current.focus();
                 }
               }
             }}
           />
         </div>
       )}
       <header style={headerStyle}> <div style={logoStyle}>Maestro</div> <div style={scoreStyle}>Score: {score}</div> <div style={iconsStyle}><span onClick={handleViewInstructions} style={{cursor: 'pointer'}}>?</span><span onClick={handleViewLeaderboard} style={{cursor: 'pointer'}}>🏆</span></div> </header>
       <main style={mainContentStyle}>
          {gameState === 'quizOver' ? ( /* Quiz Over View */
             <div style={guessSectionStyle}>
                <h2 style={songTitleStyle}>Quiz Slut!</h2>
                <p style={{ fontSize: '18px', margin: '5px 0' }}>Din totalpoäng: {score}</p>
                <button style={{...buttonStyle, marginBottom: '10px'}} onClick={() => router.push(`/results`)}>Visa Resultat</button>
                <button style={buttonStyle} onClick={handleViewLeaderboard}>Visa Topplista</button>
             </div>
          ) : ( /* Active Quiz View */
            <>
              <div style={questionProgressStyle}>Fråga {currentQuestionIndex + 1} av {allQuestions.length > 0 ? allQuestions.length : '...'}</div>

              {gameState === 'preparing' ? (
                <div style={artworkContainerStyle}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%',
                    height: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '12px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}>
                    {/* Background thumbnail with blur */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundImage: `url(${getYouTubeThumbnailUrl(currentQuestion.youtube_video_id, 'high')})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      filter: 'blur(10px)',
                      opacity: 0.3,
                      zIndex: 1
                    }} />

                    {/* Loading spinner */}
                    <div style={{
                      width: '50px',
                      height: '50px',
                      border: '5px solid rgba(255, 255, 255, 0.3)',
                      borderTop: '5px solid #fff',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite',
                      marginBottom: '20px',
                      zIndex: 2
                    }}></div>

                    {/* Play button to help with autoplay restrictions */}
                    <button
                      onClick={() => {
                        // Try to play the video when user clicks
                        if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
                          // Unmute and play
                          if (typeof playerRef.current.unMute === 'function') {
                            playerRef.current.unMute();
                          }
                          playerRef.current.playVideo();

                          // Move to guessing state after a short delay
                          setTimeout(() => {
                            setGameState('guessing');
                            if (inputRefs[0].current) inputRefs[0].current.focus();
                          }, 500);
                        }
                      }}
                      style={{
                        backgroundColor: 'rgb(100, 30, 150)',
                        color: 'white',
                        border: 'none',
                        padding: '12px 30px',
                        borderRadius: '30px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 4px 10px rgba(0, 0, 0, 0.3)',
                        zIndex: 2
                      }}
                    >
                      <span style={{ marginRight: '8px' }}>▶</span> Spela musik
                    </button>

                    <style jsx>{`
                      @keyframes spin {
                        0% { transform: rotate(0deg); }
                        100% { transform: rotate(360deg); }
                      }

                      @keyframes gradientMove {
                        0% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                        100% { background-position: 0% 50%; }
                      }

                      @keyframes glow {
                        0% { box-shadow: 0 0 10px rgba(100, 30, 150, 0.5); }
                        50% { box-shadow: 0 0 20px rgba(100, 30, 150, 0.8); }
                        100% { box-shadow: 0 0 10px rgba(100, 30, 150, 0.5); }
                      }

                      .animated-button {
                        background: linear-gradient(90deg, #6e30c9, #b48ee6, #6e30c9);
                        background-size: 200% 200%;
                        animation: gradientMove 3s ease infinite, glow 2s ease-in-out infinite;
                      }

                      .animated-button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
                      }

                      .animated-button:active {
                        transform: translateY(1px);
                        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                      }
                    `}</style>
                  </div>
                </div>
              ) : (
                <div style={artworkContainerStyle}>
                  <img
                    src={getYouTubeThumbnailUrl(currentQuestion.youtube_video_id, 'high')}
                    alt={`Thumbnail for ${currentQuestion.title}`}
                    style={artworkStyle}
                  />
                </div>
              )}

              <div style={songInfoStyle}><h2 style={songTitleStyle}>{currentQuestion.title}</h2><p style={artistNameStyle}>av {currentQuestion.artist}</p></div>
              {gameState === 'guessing' && (
                <div style={guessSectionStyle}>
                  <p style={questionTextStyle}>Vilket år släpptes låten?</p>

                  <div style={yearInputsContainerStyle}>
                    {yearDigits.map((digit, index) => (
                      <input
                        key={index}
                        ref={inputRefs[index]}
                        type="text"
                        maxLength={1}
                        value={hasInteractedWithSlider ? digit : ''}
                        onChange={(e) => handleDigitInputChange(index, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(index, e)}
                        style={yearInputStyle}
                        placeholder={hasInteractedWithSlider ? '' : '_'}
                      />
                    ))}
                  </div>

                  <div style={sliderContainerStyle}>
                    <span>{MIN_YEAR}</span>
                    <MobileSlider
                      min={MIN_YEAR}
                      max={MAX_YEAR}
                      value={selectedYear}
                      onChange={handleSliderChange}
                    />
                    <span>{MAX_YEAR}</span>
                  </div>

                  <button
                    className="animated-button"
                    style={{
                      ...buttonStyle,
                      zIndex: 10
                    }}
                    onClick={handleGuess}
                  >
                    GISSA
                  </button>
                </div>
              )}
              {gameState === 'feedback' && userGuessFeedback && (
                <div style={guessSectionStyle}>
                  <div style={triviaBubbleStyle}>
                    💡 {currentQuestion.trivia}
                  </div>

                  <div style={timelineWrapperStyle}>
                    <div style={{
                      position: 'relative',
                      width: '100%',
                      height: '80px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: '20px',
                      marginBottom: '20px'
                    }}>
                      {/* Timeline bar */}
                      <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '4px',
                        backgroundColor: 'rgba(255, 255, 255, 0.3)',
                        borderRadius: '2px'
                      }}></div>

                      {/* Correct year marker - always on top */}
                      <div style={{
                        position: 'absolute',
                        top: '0',
                        left: calculateTimelinePosition(currentQuestion.correct_year, MIN_YEAR, MAX_YEAR),
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                      }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: 'bold',
                          color: '#fff',
                          marginBottom: '8px'
                        }}>
                          {currentQuestion.correct_year}
                        </div>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          backgroundColor: '#fff',
                          borderRadius: '50%'
                        }}></div>
                      </div>

                      {/* Guessed year marker - always on bottom */}
                      {userGuessFeedback.guessedYear !== currentQuestion.correct_year && (
                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          left: calculateTimelinePosition(userGuessFeedback.guessedYear, MIN_YEAR, MAX_YEAR),
                          transform: 'translateX(-50%)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center'
                        }}>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#b48ee6',
                            borderRadius: '50%',
                            marginBottom: '8px'
                          }}></div>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: 'bold',
                            color: '#b48ee6'
                          }}>
                            {userGuessFeedback.guessedYear}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Answer text */}
                    <div style={{
                      textAlign: 'center',
                      marginTop: '10px',
                      marginBottom: '10px'
                    }}>
                      <div style={{
                        fontSize: '28px',
                        fontWeight: 'bold',
                        marginBottom: '5px'
                      }}>
                        Svar: <span style={{ color: '#b48ee6' }}>{currentQuestion.correct_year}</span>
                      </div>

                      <div style={{
                        fontSize: '20px',
                        fontWeight: 'bold',
                        color: 'rgba(255, 255, 255, 0.8)',
                        marginBottom: '15px'
                      }}>
{userGuessFeedback.yearDifference !== 0 ? 
    `${Math.abs(userGuessFeedback.yearDifference)} ÅR ${userGuessFeedback.yearDifference > 0 ? 'FÖR TIDIGT' : 'FÖR SENT'}!` : 
    'RÄTT!'} {userGuessFeedback.isCorrect ? '🎯' : '😮'}                      </div>

                      <div style={{
                        fontSize: '24px',
                        fontWeight: 'bold',
                        color: '#ffcc00'
                      }}>
                        +{userGuessFeedback.points} POÄNG
                      </div>
                    </div>
                  </div>

                  <button
                    className="animated-button"
                    style={{
                      ...buttonStyle,
                      zIndex: 10,
                      marginTop: '30px'
                    }}
                    onClick={handleNextSong}
                  >
                    NÄSTA LÅT →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    );
 };

 export default QuizPage;