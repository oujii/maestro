# Maestro Quiz - Project Summary

## Overview
Maestro Quiz is a Swedish-language music trivia web application where users guess the release year of songs. Built as a daily quiz game with music streaming integration and social features.

## Core Functionality
- **Daily Music Quiz**: 4 questions per day with songs from a database
- **Year Guessing**: Users guess release years of songs using an interactive slider interface  
- **Music Streaming**: Integrates Deezer API for album covers and 30-second song previews
- **Scoring System**: Points based on accuracy (1000 for exact, decreasing by year difference)
- **Progress Persistence**: Saves quiz progress to localStorage for session resumption
- **Social Features**: Leaderboard with score submission and result sharing

## Technical Architecture

### Frontend Stack
- **Framework**: Next.js 15 with App Router and React 19
- **Language**: TypeScript with strict mode enabled
- **Styling**: Tailwind CSS v4 with custom component styling
- **UI Components**: Custom mobile-optimized slider, confetti animations
- **State Management**: React hooks with localStorage persistence

### Backend & Data
- **Database**: Supabase PostgreSQL with two main tables:
  - `questions`: Song data (title, artist, year, YouTube ID, trivia)
  - `leaderboard`: User scores and names
- **Authentication**: None (anonymous usage)
- **Server Actions**: Next.js server actions for score submission

### Music Integration
- **Primary**: Deezer API via RapidAPI for album covers and song previews
- **Fallback**: YouTube thumbnails when Deezer data unavailable
- **Caching**: Client-side caching of Deezer API responses
- **Audio Playback**: Web Audio API with autoplay control

### Key Features
- **Mobile-First**: Touch-optimized slider with haptic-style interactions
- **PWA Support**: Manifest and service worker for app-like experience
- **Accessibility**: Keyboard navigation and screen reader support
- **Performance**: Image preloading, API response caching
- **Internationalization**: Swedish language throughout (comments mix Swedish/English)

## File Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Homepage with settings
│   ├── quiz/page.tsx      # Main quiz interface
│   ├── results/page.tsx   # Score display and sharing
│   ├── leaderboard/page.tsx # Global leaderboard
│   └── actions.ts         # Server actions
├── components/
│   └── MobileSlider.tsx   # Custom touch slider component
├── lib/
│   └── supabaseClient.ts  # Database client setup
└── utils/
    ├── deezer.ts          # Deezer API integration
    └── youtube.ts         # YouTube utility functions
```

## Data Flow
1. **Quiz Initialization**: Fetch daily questions from Supabase by date
2. **Music Loading**: Search Deezer for each song, cache results
3. **User Interaction**: Capture year guesses via slider/input
4. **Scoring**: Calculate points based on year accuracy
5. **Progress Saving**: Store state in localStorage for resumption
6. **Results**: Display performance with music metadata
7. **Social Sharing**: Submit scores to leaderboard

## Environment Requirements
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase anonymous key
- Deezer API key embedded in source (via RapidAPI)

## Deployment Considerations
- Static site compatible (uses client-side data fetching)
- Requires HTTPS for audio autoplay features
- Mobile-optimized for various screen sizes
- Progressive Web App capabilities included

This quiz application demonstrates modern web development practices with real-time music streaming, persistence, and social features optimized for mobile music discovery experiences.
