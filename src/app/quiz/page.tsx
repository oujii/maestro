// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/quiz/page.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import Confetti from 'react-confetti';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MobileSlider from '../../components/MobileSlider';
import { searchDeezerTrack, getDeezerAlbumCover, getDeezerPreviewUrl, getYouTubeFallbackThumbnail } from '../../utils/deezer';

interface Question {
  id: string;
  title: string;
  artist: string;
  correct_year: number;
  youtube_video_id: string; // We'll keep using this ID from the database
  trivia: string;
  quiz_date?: string;
  // Added Deezer-related fields
  deezerTrack?: any; // Store the Deezer track object
}

interface RoundResult {
  questionId: string;
  title: string;
  artist: string;
  youtubeVideoId: string; // Keep this for backward compatibility
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
  const [isAudioReady, setIsAudioReady] = useState<boolean>(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState<boolean>(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [hasInteractedWithSlider, setHasInteractedWithSlider] = useState<boolean>(false);
  const [deezerTracks, setDeezerTracks] = useState<Record<string, any>>({});

  const audioRef = useRef<HTMLAudioElement>(null);
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
      const question = allQuestions[currentQuestionIndex];
      setCurrentQuestion(question);
      // Sätt ett initialt värde i mitten av tidslinjen
      setSelectedYear(1960);
      setYearDigits(['', '', '', '']);
      setUserGuessFeedback(null);
      setShowConfetti(false);
      setIsAudioReady(false);
      setIsAudioPlaying(false);
      setHasInteractedWithSlider(false);

      // Reset audio player when changing questions
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        } catch (error) {
          console.error("Error stopping audio:", error);
        }
      }

      // Fetch Deezer track if not already fetched
      const fetchDeezerTrack = async () => {
        try {
          // Search for the track on Deezer
          const deezerTrack = await searchDeezerTrack(
            question.artist,
            question.title,
            question.youtube_video_id
          );

          if (deezerTrack) {
            // Update the question with Deezer track info
            const updatedQuestion = { ...question, deezerTrack };

            // Update the current question with Deezer data
            setCurrentQuestion(updatedQuestion);

            // Update the deezer tracks cache
            setDeezerTracks(prev => ({
              ...prev,
              [question.id]: deezerTrack
            }));
          }
        } catch (error) {
          console.error("Error fetching Deezer track:", error);
        }
      };

      fetchDeezerTrack();
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
      // Safely pause the audio if it's playing
      if (audioRef.current) {
        audioRef.current.pause();
      }
    } catch (error) {
      console.error("Error pausing audio:", error);
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
      // Safely stop the audio if it's playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    } catch (error) {
      console.error("Error stopping audio:", error);
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

  const handleAudioReady = () => {
    try {
      setIsAudioReady(true);

      // Try to play the audio
      if (audioRef.current) {
        // Set volume to high
        audioRef.current.volume = 1.0;

        // Play the audio
        const playPromise = audioRef.current.play();

        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              // Audio is playing
              setIsAudioPlaying(true);

              // If we're in preparing state, move to guessing state
              if (gameState === 'preparing') {
                setGameState('guessing');
              }
            })
            .catch(error => {
              console.error("Error playing audio:", error);
              // If autoplay is blocked, we'll need user interaction
              // The play button in the UI will handle this
            });
        }

        // Set a timeout to move to guessing state even if audio fails to play
        setTimeout(() => {
          if (gameState === 'preparing') {
            console.warn("Timeout waiting for audio to play, moving to guessing state");
            setGameState('guessing');
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Error initializing audio player:", error);
      // If there's an error, still move to guessing state after a delay
      if (gameState === 'preparing') {
        setTimeout(() => {
          setGameState('guessing');
        }, 1000);
      }
    }
  };

  const handleAudioPlay = () => {
    setIsAudioPlaying(true);
    if (gameState === 'preparing') {
      setGameState('guessing');
    }
  };

  const handleAudioPause = () => {
    setIsAudioPlaying(false);
  };

  const handleAudioEnded = () => {
    setIsAudioPlaying(false);
    // Optionally loop the audio
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(e => console.error("Error replaying audio:", e));
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
       {(gameState === 'preparing' || gameState === 'guessing') && currentQuestion && currentQuestion.deezerTrack && (
         <audio
           ref={audioRef}
           src={getDeezerPreviewUrl(currentQuestion.deezerTrack)}
           preload="auto"
           onCanPlayThrough={handleAudioReady}
           onPlay={handleAudioPlay}
           onPause={handleAudioPause}
           onEnded={handleAudioEnded}
           style={{ display: 'none' }}
         />
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
                      backgroundImage: `url(${currentQuestion.deezerTrack ?
                        getDeezerAlbumCover(currentQuestion.deezerTrack, 'big') :
                        getYouTubeFallbackThumbnail(currentQuestion.youtube_video_id, 'high')})`,
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
                        // Try to play the audio when user clicks
                        if (audioRef.current) {
                          // Play the audio
                          audioRef.current.play()
                            .then(() => {
                              setIsAudioPlaying(true);

                              // Move to guessing state after a short delay
                              setTimeout(() => {
                                setGameState('guessing');
                                if (inputRefs[0].current) inputRefs[0].current.focus();
                              }, 500);
                            })
                            .catch(error => {
                              console.error("Error playing audio:", error);
                              // Still move to guessing state even if audio fails
                              setGameState('guessing');
                            });
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
                    src={currentQuestion.deezerTrack ?
                      getDeezerAlbumCover(currentQuestion.deezerTrack, 'big') :
                      getYouTubeFallbackThumbnail(currentQuestion.youtube_video_id, 'high')}
                    alt={`Album cover for ${currentQuestion.title}`}
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
                        placeholder="" // Ändra från placeholder={hasInteractedWithSlider ? '' : '_'} till bara tom sträng
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
                      height: '100px',
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
                        borderRadius: '2px',
                        top: '50%',
                        transform: 'translateY(-50%)'
                      }}></div>

                      {/* Correct year marker - on top */}
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
                      </div>

                      {/* Correct year circle - on the line */}
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: calculateTimelinePosition(currentQuestion.correct_year, MIN_YEAR, MAX_YEAR),
                        transform: 'translate(-50%, -50%)',
                        width: '16px',
                        height: '16px',
                        backgroundColor: '#fff',
                        borderRadius: '50%',
                        zIndex: 2
                      }}></div>

                      {/* Guessed year marker - on bottom */}
                      {userGuessFeedback.guessedYear !== currentQuestion.correct_year && (
                        <>
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
                              fontSize: '18px',
                              fontWeight: 'bold',
                              color: '#b48ee6',
                              marginTop: '8px'
                            }}>
                              {userGuessFeedback.guessedYear}
                            </div>
                          </div>

                          {/* Guessed year circle - on the line */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: calculateTimelinePosition(userGuessFeedback.guessedYear, MIN_YEAR, MAX_YEAR),
                            transform: 'translate(-50%, -50%)',
                            width: '16px',
                            height: '16px',
                            backgroundColor: '#b48ee6',
                            borderRadius: '50%',
                            zIndex: 2
                          }}></div>

                          {/* Line showing the difference between years */}
                          <div style={{
                            position: 'absolute',
                            top: '50%',
                            left: calculateTimelinePosition(Math.min(userGuessFeedback.guessedYear, currentQuestion.correct_year), MIN_YEAR, MAX_YEAR),
                            width: `${Math.abs(
                              parseFloat(calculateTimelinePosition(userGuessFeedback.guessedYear, MIN_YEAR, MAX_YEAR)) -
                              parseFloat(calculateTimelinePosition(currentQuestion.correct_year, MIN_YEAR, MAX_YEAR))
                            )}%`,
                            height: '4px',
                            backgroundColor: 'rgba(180, 142, 230, 0.7)',
                            transform: 'translateY(-50%)',
                            zIndex: 1
                          }}></div>
                        </>
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


    {userGuessFeedback.isCorrect ? 'RÄTT! 🎯' : `${Math.abs(userGuessFeedback.yearDifference)} ÅRS SKILLNAD 😮`}
                  </div>

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
