// /Users/carl/Library/Application Support/Claude/maestro/maestro/src/app/quiz/page.tsx
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Confetti from 'react-confetti';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import MobileSlider from '../../components/MobileSlider';
import NavigationHeader from '@/components/NavigationHeader';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faVolumeUp, faVolumeMute, faBullseye } from '@fortawesome/free-solid-svg-icons';
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
  const [isImageLoaded, setIsImageLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeAudio, setActiveAudio] = useState<HTMLAudioElement | null>(null);
  const [autoPlayMusic, setAutoPlayMusic] = useState<boolean>(true);
  const [showExitConfirmation, setShowExitConfirmation] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement>(null);
  const inputRefs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];
const initialPlayDoneForIndex = useRef<number | null>(null);
const prevQuestionIndexRef = useRef<number | null>(null);

// Funktion för att manuellt spela upp musik
  const playMusic = useCallback((previewUrl: string | null) => {
    if (!previewUrl) {
      console.warn("playMusic called without a preview URL.");
      return;
    }

    console.log("Playing music with URL:", previewUrl);

    // Stoppa eventuell tidigare musik först
    if (activeAudio) {
      // Först ta bort alla event listeners för att undvika callbacks
      activeAudio.oncanplaythrough = null;
      activeAudio.onplay = null;
      activeAudio.onpause = null;
      activeAudio.onended = null;
      activeAudio.onerror = null;

      // Pausa uppspelningen
      activeAudio.pause();

      // Sätt src till en tom blob istället för tom sträng för att undvika felmeddelanden
      try {
        // Skapa en tom ljudblob
        const emptyBlob = new Blob([], { type: 'audio/mp3' });
        const emptyBlobUrl = URL.createObjectURL(emptyBlob);
        activeAudio.src = emptyBlobUrl;

        // Frigör blob-URL:en efter att den har använts
        URL.revokeObjectURL(emptyBlobUrl);
      } catch (error) {
        console.warn("Could not create empty blob:", error);
        // Fallback: sätt src till tom sträng
        activeAudio.src = "";
      }

      setActiveAudio(null);
    }

    // Skapa ett nytt Audio-element
    const manualAudio = new Audio(previewUrl);
    manualAudio.volume = 1.0;
    manualAudio.muted = isMuted;

    // Lyssna på händelser
    manualAudio.oncanplaythrough = () => {
      console.log("Manual audio can play through");
    };

    manualAudio.onplay = () => {
      console.log("Manual audio started playing");
      setIsAudioPlaying(true);
    };

    manualAudio.onerror = () => {
      const errorCode = manualAudio.error ? manualAudio.error.code : 'unknown';
      const errorMessage = manualAudio.error ? manualAudio.error.message : 'unknown error';

      console.error("Manual audio error:", {
        code: errorCode,
        message: errorMessage,
        src: manualAudio.src
      });

      setIsAudioPlaying(false);
      setActiveAudio(null);
    };

    manualAudio.onended = () => {
      console.log("Manual audio playback ended");
      setIsAudioPlaying(false);
    };

    // Spara det nya Audio-objektet i state
    setActiveAudio(manualAudio);

    // Försök spela upp ljudet
    try {
      manualAudio.play()
        .catch(error => {
          console.error("Error playing manual audio:", error);

          if (error.name === 'NotAllowedError') {
            console.log("Playback was prevented due to lack of user interaction");

            // Vi kan inte spela upp ljud automatiskt, men vi kan fortsätta ändå
            // Användaren får klara sig utan ljud tills de interagerar med sidan
          }

          setIsAudioPlaying(false);
          setActiveAudio(null);
        });
    } catch (error) {
      console.error("Exception playing manual audio:", error);
      setIsAudioPlaying(false);
      setActiveAudio(null);
    }
  }, [activeAudio]); // Removed currentQuestion from dependencies
  // Läs inställningar från localStorage
  useEffect(() => {
    try {
      const savedAutoPlay = localStorage.getItem('maestroAutoPlayMusic');
      if (savedAutoPlay !== null) {
        setAutoPlayMusic(savedAutoPlay === 'true');
        console.log("Loaded autoplay setting:", savedAutoPlay === 'true');
      }

      const savedMuted = localStorage.getItem('maestroAudioMuted');
      if (savedMuted !== null) {
        setIsMuted(savedMuted === 'true');
        console.log("Loaded mute setting:", savedMuted === 'true');
      }
    } catch (error) {
      console.error("Error reading settings from localStorage:", error);
    }
  }, []);

  // Hjälpfunktion för att testa ljuduppspelning från konsolen
  useEffect(() => {
    // Lägg till en global funktion för att testa ljuduppspelning
    (window as any).testAudio = (url: string) => {
      console.log("Testing audio playback with URL:", url);

      const testAudio = new Audio(url);
      testAudio.volume = 1.0;

      testAudio.oncanplaythrough = () => {
        console.log("Test audio can play through");
      };

      testAudio.onplay = () => {
        console.log("Test audio started playing");
      };

      testAudio.onerror = (e) => {
        console.error("Test audio error:", e);
        console.error("Test audio error details:", {
          error: testAudio.error,
          src: testAudio.src,
          readyState: testAudio.readyState,
          networkState: testAudio.networkState
        });
      };

      const playPromise = testAudio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Test audio playing successfully");
          })
          .catch(error => {
            console.error("Test audio play error:", error);
          });
      }

      return "Testing audio playback. Check console for results.";
    };

    console.log("Du kan testa ljuduppspelning genom att köra window.testAudio(url) i konsolen");
  }, []);

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
      const hasQuestionIndexChanged = prevQuestionIndexRef.current !== currentQuestionIndex;
      const isFirstRun = prevQuestionIndexRef.current === null;

      // Sätt laddningsstatus till true när vi börjar ladda en ny fråga
      setIsLoading(true);
      setIsImageLoaded(false);

      const question = allQuestions[currentQuestionIndex];
      setCurrentQuestion(question);
      // Sätt ett initialt värde i mitten av tidslinjen
      setSelectedYear(1960);
      setYearDigits(['', '', '', '']);
      setUserGuessFeedback(null);
      setShowConfetti(false);
      setIsAudioReady(false);
      // setIsAudioPlaying(false); // Don't reset this here if we might not stop audio

      if (hasQuestionIndexChanged || isFirstRun) {
        setHasInteractedWithSlider(false); // Reset only if question actually changed
        setIsAudioPlaying(false); // Reset playing state only if question changed
        // Stoppa all musik när vi byter fråga
        try {
          // Stoppa det aktiva ljudet om det finns
          if (activeAudio) {
            console.log("Stopping active audio because question index changed or first run.");

            // Först ta bort alla event listeners för att undvika callbacks
            activeAudio.oncanplaythrough = null;
            activeAudio.onplay = null;
            activeAudio.onpause = null;
            activeAudio.onended = null;
            activeAudio.onerror = null;

            // Pausa uppspelningen
            activeAudio.pause();

            // Sätt src till tom sträng för att stoppa och rensa.
            activeAudio.src = "";

            // Nollställ activeAudio
            setActiveAudio(null);
          }

          // Säkerhetskontroll för det inbäddade audio-elementet
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            audioRef.current.src = "";
          }
          console.log("All audio stopped and resources cleared due to question change or first run.");
        } catch (error) {
          console.error("Error stopping audio:", error);
        }
      } else {
        console.log("Question index has not changed, gameState might have. Audio not stopped.");
      }
      // Fetch Deezer track if not already fetched
      const fetchDeezerTrack = async () => {
        try {
          // Check if we already have this track in cache
          if (deezerTracks[question.id]) {
            console.log(`Using cached Deezer track for ${question.title}`);
            const updatedQuestion = { ...question, deezerTrack: deezerTracks[question.id] };
            setCurrentQuestion(updatedQuestion);

            // Förladda bilden även om vi använder cache
            if (deezerTracks[question.id].album && deezerTracks[question.id].album.cover_big) {
              const img = new Image();
              img.onload = () => {
                console.log(`Album image loaded from cache for ${question.title}`);
                setIsImageLoaded(true);
                setIsLoading(false);
                if (gameState === 'preparing') {
                  console.log("Image loaded (cache), moving from preparing to guessing state.");
                  setGameState('guessing');
                }

                // Logik för att avgöra om musik ska spelas
                const playNextSongFlag = sessionStorage.getItem('playNextSong') === 'true';
                let playThisTime = false;

                if (playNextSongFlag) {
                  // Scenario B: User clicked "Next Song"
                  console.log("img.onload (Cache): Play because 'Next Song' was clicked.");
                  playThisTime = true;
                  sessionStorage.removeItem('playNextSong');
                  initialPlayDoneForIndex.current = currentQuestionIndex; // Mark as played for this index via "Next Song"
                } else if (autoPlayMusic && initialPlayDoneForIndex.current !== currentQuestionIndex) {
                  // Scenario A (First question) or C (Resuming quiz) with autoplay enabled,
                  // AND initial play has not been done for THIS specific index yet.
                  console.log(`img.onload (Cache): Autoplay is on. Current index: ${currentQuestionIndex}. Initial play for this index not done yet.`);
                  playThisTime = true;
                  initialPlayDoneForIndex.current = currentQuestionIndex; // Mark as played for this index
                }

                if (playThisTime && updatedQuestion.deezerTrack?.preview) {
                  playMusic(updatedQuestion.deezerTrack?.preview);
                } else if (playThisTime) {
                  console.log("img.onload (Cache): Decided to play, but no preview URL.");
                }
              };
              img.onerror = () => {
                console.warn(`Failed to load cached album image for ${question.title}`);
                setIsImageLoaded(false);
                setIsLoading(false);
              };
              img.src = deezerTracks[question.id].album.cover_big;
            } else {
              // Ingen albumomslag i cache, markera som klar ändå
              console.log(`No album cover in cache for ${question.title}`);
              setIsLoading(false);
            }

            return;
          }

          console.log(`Searching Deezer for: ${question.artist} - ${question.title}`);

          // Search for the track on Deezer
          const deezerTrack = await searchDeezerTrack(
            question.artist,
            question.title,
            question.youtube_video_id
          );

          if (deezerTrack) {
            console.log(`Found Deezer track: ${deezerTrack.title} by ${deezerTrack.artist?.name}`);

            // Update the question with Deezer track info
            const updatedQuestion = { ...question, deezerTrack };

            // Update the current question with Deezer data
            setCurrentQuestion(updatedQuestion);

            // Update the deezer tracks cache
            setDeezerTracks(prev => ({
              ...prev,
              [question.id]: deezerTrack
            }));

            // Förladda bilden
            if (deezerTrack.album && deezerTrack.album.cover_big) {
              const img = new Image();
              img.onload = () => {
                console.log(`Album image loaded for ${deezerTrack.title}`);
                setIsImageLoaded(true);
                setIsLoading(false);
                if (gameState === 'preparing') {
                  console.log("Image loaded (new), moving from preparing to guessing state.");
                  setGameState('guessing');
                }

                // Logik för att avgöra om musik ska spelas
                const playNextSongFlag = sessionStorage.getItem('playNextSong') === 'true';
                let playThisTime = false;

                if (playNextSongFlag) {
                  // Scenario B: User clicked "Next Song"
                  console.log("img.onload (New): Play because 'Next Song' was clicked.");
                  playThisTime = true;
                  sessionStorage.removeItem('playNextSong');
                  initialPlayDoneForIndex.current = currentQuestionIndex; // Mark as played for this index via "Next Song"
                } else if (autoPlayMusic && initialPlayDoneForIndex.current !== currentQuestionIndex) {
                  // Scenario A (First question) or C (Resuming quiz) with autoplay enabled,
                  // AND initial play has not been done for THIS specific index yet.
                  console.log(`img.onload (New): Autoplay is on. Current index: ${currentQuestionIndex}. Initial play for this index not done yet.`);
                  playThisTime = true;
                  initialPlayDoneForIndex.current = currentQuestionIndex; // Mark as played for this index
                }

                if (playThisTime && deezerTrack?.preview) {
                  playMusic(deezerTrack?.preview);
                } else if (playThisTime) {
                  console.log("img.onload (New): Decided to play, but no preview URL.");
                }
              };
              img.onerror = () => {
                console.warn(`Failed to load album image for ${deezerTrack.title}`);
                setIsImageLoaded(false);
                setIsLoading(false);
              };
              img.src = deezerTrack.album.cover_big;
            } else {
              // Ingen albumomslag, markera som klar ändå
              console.log(`No album cover for ${deezerTrack.title}`);
              setIsImageLoaded(false);
              setIsLoading(false);
            }
          } else {
            console.warn(`No Deezer track found for ${question.artist} - ${question.title}`);
            // Ingen Deezer-data, markera som klar ändå
            setIsLoading(false);
          }
        } catch (error) {
          console.error("Error fetching Deezer track:", error);
          // Vid fel, markera som klar ändå
          setIsLoading(false);
        }
      };

      // Kör Deezer-sökningen direkt
      fetchDeezerTrack();
    }
    prevQuestionIndexRef.current = currentQuestionIndex; // Update ref for next run
  }, [currentQuestionIndex, allQuestions, gameState, activeAudio]); // Added activeAudio to dependencies

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
    // Ljudet stoppas nu av useEffect när currentQuestionIndex ändras.
    // Spara en flagga för att indikera att vi ska spela upp musik för nästa fråga
    // Detta används i useEffect för att spela upp musik när nästa fråga laddas
    sessionStorage.setItem('playNextSong', 'true');

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

  const handleExitQuiz = () => {
    if (gameState === 'guessing' || gameState === 'feedback') {
      setShowExitConfirmation(true);
    } else {
      router.push('/');
    }
  };

  const confirmExitQuiz = () => {
    // Stop any playing audio
    if (activeAudio) {
      activeAudio.pause();
      setActiveAudio(null);
    }
    setShowExitConfirmation(false);
    router.push('/');
  };

  const cancelExitQuiz = () => {
    setShowExitConfirmation(false);
  };

  const toggleMute = () => {
    if (activeAudio) {
      activeAudio.muted = !isMuted;
      setIsMuted(!isMuted);

      // Save mute preference
      try {
        localStorage.setItem('maestroAudioMuted', (!isMuted).toString());
      } catch (error) {
        console.error('Error saving mute preference:', error);
      }
    } else {
      setIsMuted(!isMuted);
      try {
        localStorage.setItem('maestroAudioMuted', (!isMuted).toString());
      } catch (error) {
        console.error('Error saving mute preference:', error);
      }
    }
  };



  const pageStyle: React.CSSProperties = { 
    backgroundColor: 'rgb(20, 16, 44)', 
    color: 'white', 
    height: '100vh', 
    display: 'flex', 
    flexDirection: 'column', 
    overflow: 'hidden' 
  };
  const headerStyle: React.CSSProperties = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '20px 20px 0 20px', 
    width: '100%', 
    maxWidth: '600px', 
    margin: '0 auto',
    flexShrink: 0
  };
  const logoStyle: React.CSSProperties = { fontSize: '24px', fontWeight: 'bold' };
  const scoreStyle: React.CSSProperties = { fontSize: '18px' };
  const iconsStyle: React.CSSProperties = { fontSize: '24px', display: 'flex', gap: '15px' };
  const mainContentStyle: React.CSSProperties = { 
    width: '100%', 
    maxWidth: '450px', 
    textAlign: 'center', 
    margin: '0 auto',
    flexGrow: 1, 
    overflowY: 'auto',
    padding: '0',
    position: 'relative'
  };
  
  const backgroundImageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 1
  };
  
  const textOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    right: '20px',
    zIndex: 2,
    textAlign: 'center',
    background: 'linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.8) 100%)',
    padding: '40px 20px 20px 20px',
    borderRadius: '0 0 15px 15px'
  };
  
  const questionProgressOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    left: '20px',
    zIndex: 2,
    fontSize: '16px',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '8px 12px',
    borderRadius: '8px'
  };
  const controlSectionStyle: React.CSSProperties = {
    flexShrink: 0,
    backgroundColor: 'rgb(20, 16, 44)',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    padding: '20px',
    width: '100%',
    maxWidth: '450px',
    margin: '0 auto'
  };
  const questionProgressStyle: React.CSSProperties = { textAlign: 'left', fontSize: '16px', marginBottom: '15px', color: 'rgba(255, 255, 255, 0.8)' };
  const artworkContainerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'center', marginBottom: '10px' };
  const artworkStyle: React.CSSProperties = { width: '80%', maxWidth: '300px', height: 'auto', borderRadius: '15px', objectFit: 'cover' };
  const songInfoStyle: React.CSSProperties = { textAlign: 'center', marginBottom: '20px' };
  const songTitleStyle: React.CSSProperties = { 
    fontSize: '28px', 
    fontWeight: 'bold', 
    marginBottom: '8px',
    color: 'white',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)',
    lineHeight: '1.2'
  };
  const artistNameStyle: React.CSSProperties = { 
    fontSize: '18px', 
    color: 'rgba(255, 255, 255, 0.9)',
    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8)'
  };
  const guessSectionStyle: React.CSSProperties = { textAlign: 'center' };
  const questionTextStyle: React.CSSProperties = { fontSize: '18px', marginBottom: '20px' };
  const yearInputsContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px'
  };
  const yearInputStyle: React.CSSProperties = { width: '50px', height: '60px', textAlign: 'center', fontSize: '28px', fontWeight: 'bold', backgroundColor: 'rgba(100, 30, 150, 0.3)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', color: 'white' };
  const buttonStyle: React.CSSProperties = {
    backgroundColor: 'rgb(100, 30, 150)',
    color: 'white',
    border: 'none',
    padding: '15px 0',
    width: '80%',
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
  if (gameState === 'alreadyPlayed') return (
    <div style={pageStyle}>
      <NavigationHeader
        title="Maestro"
        backPath="/"
      />
      <main style={{
        ...mainContentStyle,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center',
        padding: '40px 20px'
      }}>
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '15px',
          padding: '40px 30px',
          maxWidth: '500px',
          width: '100%'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '20px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px'
          }}>
            Redan spelat idag! <FontAwesomeIcon icon={faBullseye} />
          </h2>
          <p style={{
            fontSize: '18px',
            color: 'rgba(255,255,255,0.9)',
            marginBottom: '30px',
            lineHeight: '1.6'
          }}>
            Du har redan spelat dagens quiz. Välkommen tillbaka imorgon för nya utmaningar!
          </p>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '15px',
            maxWidth: '300px',
            margin: '0 auto'
          }}>
            <button
              style={{
                ...buttonStyle,
                width: '100%',
                padding: '15px 30px',
                fontSize: '16px'
              }}
              onClick={handleViewLeaderboard}
            >
              Visa Topplista
            </button>
            <button
              style={{
                ...buttonStyle,
                width: '100%',
                padding: '15px 30px',
                fontSize: '16px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
              onClick={() => router.push('/results')}
            >
              Visa Resultat
            </button>
          </div>
        </div>
      </main>
    </div>
  );
  if (gameState === 'noQuestions') return <div style={pageStyle}><p style={centeredMessageStyle}>Inga frågor hittades för dagens quiz. Försök igen imorgon!</p></div>;
  if (gameState === 'errorFetching') return <div style={pageStyle}><p style={{...centeredMessageStyle, color: 'red'}}>Kunde inte ladda frågor. Kontrollera din anslutning och försök igen.</p></div>;
  if (!currentQuestion) return <div style={pageStyle}><p style={centeredMessageStyle}>Väntar på fråga...</p></div>;

  return (
     <div style={pageStyle}>
       {showConfetti && <Confetti width={windowSize.width} height={windowSize.height} recycle={false} numberOfPieces={200} />}
       {/* Vi använder inte längre det inbäddade audio-elementet för uppspelning
           eftersom det orsakar problem med omladdning.
           Istället skapar vi ett nytt Audio-objekt när användaren klickar på play-knappen.
           Vi behåller referensen för att kunna använda den i andra delar av koden. */}
       <audio
         ref={audioRef}
         style={{ display: 'none' }}
       />
       <NavigationHeader
         title="Maestro"
         customBackAction={handleExitQuiz}
         showHomeButton={false}
         rightContent={
           <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
             <div style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
               Score: {score}
             </div>
             {(gameState === 'guessing' || gameState === 'feedback') && (
               <button
                 style={{
                   background: 'rgba(255, 255, 255, 0.1)',
                   border: '1px solid rgba(255, 255, 255, 0.2)',
                   borderRadius: '50%',
                   width: '40px',
                   height: '40px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   color: 'white',
                   fontSize: '18px',
                   cursor: 'pointer',
                   transition: 'all 0.2s ease'
                 }}
                 onClick={toggleMute}
                 title={isMuted ? 'Slå på ljud' : 'Stäng av ljud'}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                   e.currentTarget.style.transform = 'translateY(-1px)';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                   e.currentTarget.style.transform = 'translateY(0)';
                 }}
               >
                 <FontAwesomeIcon icon={isMuted ? faVolumeMute : faVolumeUp} />
               </button>
             )}
           </div>
         }
       />
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
          {/* Guessing State Layout */}
          {gameState === 'guessing' && (
          <>
            {/* Background Image */}
            {!isLoading && currentQuestion && (
                <img
                  src={currentQuestion.deezerTrack ?
                    getDeezerAlbumCover(currentQuestion.deezerTrack, 'big') :
                    getYouTubeFallbackThumbnail(currentQuestion.youtube_video_id, 'high')}
                  alt={`Album cover for ${currentQuestion.title}`}
                  style={backgroundImageStyle}
                  onLoad={() => setIsImageLoaded(true)}
                  onError={() => {
                    console.warn(`Failed to load album image for ${currentQuestion.title}`);
                    setIsImageLoaded(false);
                  }}
                />
              )}

              {/* Loading overlay */}
              {isLoading && (
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: 'rgba(20, 16, 44, 0.9)',
                  zIndex: 3
                }}>
                  <div style={{
                    width: '50px',
          height: '50px',
                    border: '5px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '5px solid #fff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                </div>
              )}

              {/* Question Progress Overlay */}
              <div style={questionProgressOverlayStyle}>
                Fråga {currentQuestionIndex + 1} av {allQuestions.length > 0 ? allQuestions.length : '...'}
              </div>

          {/* Song Info Overlay */}
              <div style={textOverlayStyle}>
                <h2 style={songTitleStyle}>{currentQuestion.title}</h2>
                <p style={artistNameStyle}>av {currentQuestion.artist}</p>
              </div>
            </>
          )}

          {/* Feedback State Layout */}
          {gameState === 'feedback' && userGuessFeedback && (
            <div style={{
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              height: '100%',
              overflowY: 'auto',
              paddingBottom: '120px' // Make room for fixed button
            }}>
              {/* Question Progress */}
              <div style={{
                textAlign: 'left',
                fontSize: '16px',
                marginBottom: '15px',
                color: 'rgba(255, 255, 255, 0.8)',
                alignSelf: 'flex-start'
              }}>
                Fråga {currentQuestionIndex + 1} av {allQuestions.length > 0 ? allQuestions.length : '...'}
              </div>

              {/* Two-column layout: Album Cover and Song Info */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                marginBottom: '15px',
                width: '100%'
              }}>
                {/* Album Cover */}
                <img
                  src={currentQuestion.deezerTrack ?
                getDeezerAlbumCover(currentQuestion.deezerTrack, 'big') :
              getYouTubeFallbackThumbnail(currentQuestion.youtube_video_id, 'high')}
                  alt={`Album cover for ${currentQuestion.title}`}
                  style={{
                    width: '120px',
                    height: '120px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                    flexShrink: 0
                  }}
                />

                {/* Song Info */}
                <div style={{ 
                  textAlign: 'left',
                  flex: 1
                }}>
                  <h2 style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    marginBottom: '4px',
                    color: 'white',
                    lineHeight: '1.2'
                  }}>{currentQuestion.title}</h2>
                  <p style={{
                    fontSize: '14px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    margin: 0
                  }}>av {currentQuestion.artist}</p>
                </div>
              </div>

              {/* Timeline */}
              <div style={{...timelineWrapperStyle, margin: '10px auto', padding: '10px 0'}}>
                <div style={{
                  position: 'relative',
                  width: '100%',
                  height: '80px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginTop: '10px',
                  marginBottom: '10px'
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
                  marginTop: '5px',
                  marginBottom: '5px'
                }}>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    marginBottom: '3px'
                  }}>
                    Svar: <span style={{ color: '#b48ee6' }}>{currentQuestion.correct_year}</span>
                  </div>

                  <div style={{
                    fontSize: '18px',
                    fontWeight: 'bold',
                    color: 'rgba(255, 255, 255, 0.8)',
                    marginBottom: '8px'
                  }}>
                    {userGuessFeedback.isCorrect ? 'RÄTT! 🎯' : `${Math.abs(userGuessFeedback.yearDifference)} ÅRS SKILLNAD 😮`}
                  </div>

                  <div style={{
                    fontSize: '20px',
                    fontWeight: 'bold',
                    color: '#ffcc00'
                  }}>
                    +{userGuessFeedback.points} POÄNG
                  </div>
                </div>
              </div>

              {/* Trivia - moved after result block */}
              <div style={{
                ...triviaBubbleStyle,
                margin: '15px auto',
                maxWidth: '400px',
                fontSize: '13px',
                padding: '12px'
              }}>
                💡 {currentQuestion.trivia}
              </div>
            </div>
          )}
          </>
        )}
        </main>

        {/* Exit Confirmation Modal */}
        {showExitConfirmation && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'rgb(30, 20, 54)',
              padding: '30px',
              borderRadius: '15px',
              width: '90%',
              maxWidth: '400px',
              textAlign: 'center',
              color: 'white'
            }}>
              <h2 style={{ fontSize: '22px', marginBottom: '15px' }}>
                Avsluta quiz?
              </h2>
              <p style={{ fontSize: '16px', marginBottom: '25px', color: 'rgba(255,255,255,0.8)' }}>
                Ditt framsteg kommer att sparas och du kan fortsätta senare.
              </p>
              <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
                <button
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                  onClick={cancelExitQuiz}
                >
                  Fortsätt spela
                </button>
                <button
                  style={{
                    backgroundColor: 'rgb(100, 30, 150)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 20px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    cursor: 'pointer'
                  }}
                  onClick={confirmExitQuiz}
                >
                  Avsluta
                </button>
              </div>
            </div>
          </div>
        )}

         {/* Fixed Control Section for Guessing */}
         {gameState === 'guessing' && (
           <div style={controlSectionStyle}>
             <div style={yearInputsContainerStyle}>
               <button
                 onClick={() => {
                   if (selectedYear && selectedYear > MIN_YEAR) {
                     const newValue = selectedYear - 1;
                     setSelectedYear(newValue);
                     if (!hasInteractedWithSlider) {
                       setHasInteractedWithSlider(true);
                     }
                   }
                 }}
                 style={{
                   backgroundColor: 'rgba(100, 30, 150, 0.8)',
                   color: 'white',
                   border: 'none',
                   borderRadius: '50%',
                   width: '40px',
                   height: '40px',
                   fontSize: '20px',
                   fontWeight: 'bold',
                   cursor: 'pointer',
                   boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                 }}
               >
                 -
               </button>
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
                   placeholder=""
                 />
               ))}
               <button
                 onClick={() => {
                   if (selectedYear && selectedYear < MAX_YEAR) {
                     const newValue = selectedYear + 1;
                     setSelectedYear(newValue);
                     if (!hasInteractedWithSlider) {
                       setHasInteractedWithSlider(true);
                     }
                   }
                 }}
                 style={{
                   backgroundColor: 'rgba(100, 30, 150, 0.8)',
                   color: 'white',
                   border: 'none',
                   borderRadius: '50%',
                   width: '40px',
                   height: '40px',
                   fontSize: '20px',
                   fontWeight: 'bold',
                   cursor: 'pointer',
                   boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                 }}
               >
                 +
               </button>
             </div>

             <div style={{
               display: 'flex',
               flexDirection: 'column',
               width: '100%',
               maxWidth: '400px',
               margin: '0 auto 20px auto',
             }}>
               <div style={{
                 width: '100%',
                 marginBottom: '15px'
               }}>
                 <MobileSlider
                   min={MIN_YEAR}
                   max={MAX_YEAR}
                   value={selectedYear}
                   onChange={handleSliderChange}
                 />
               </div>
             </div>

             <button
               className="animated-button"
               style={{
                 ...buttonStyle,
                 zIndex: 10,
                 width: '100%',
                 maxWidth: '400px',
                 margin: '0 auto'
               }}
               onClick={handleGuess}
             >
               GISSA
             </button>
           </div>
           )}

               {/* Fixed Control Section for Feedback */}
         {gameState === 'feedback' && (
           <div style={controlSectionStyle}>
             <button
               className="animated-button"
               style={{
                 ...buttonStyle,
                 zIndex: 10,
                 width: '100%',
                 maxWidth: '400px',
                 margin: '0 auto'
               }}
               onClick={handleNextSong}
             >
               NÄSTA LÅT →
             </button>
           </div>
         )}
      </div>
     );
};

 export default QuizPage;
