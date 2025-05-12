/**
 * Utility functions for working with Deezer API through RapidAPI
 */

// Cache for Deezer search results to avoid redundant API calls
const searchCache: Record<string, any> = {};
const trackCache: Record<string, any> = {};

/**
 * Search for a track on Deezer using artist and title
 * @param artist The artist name
 * @param title The track title
 * @param youtubeId The YouTube ID (used as cache key and fallback)
 * @returns The first matching track or null if not found
 */
export async function searchDeezerTrack(artist: string, title: string, youtubeId: string): Promise<any> {
  // Check cache first
  const cacheKey = `${artist}-${title}-${youtubeId}`;
  if (searchCache[cacheKey]) {
    console.log(`Using cached Deezer search result for: ${cacheKey}`);
    return searchCache[cacheKey];
  }

  try {
    console.log(`Searching Deezer for: "${artist} - ${title}"`);

    // Create search query - combine artist and title for better results
    const query = `${artist} ${title}`;

    // Make API request to Deezer via RapidAPI
    const response = await fetch(`https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(query)}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': 'e91bc1509cmsh7643f0470bb4185p1bc0ffjsnef20886dc679',
        'x-rapidapi-host': 'deezerdevs-deezer.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }

    const data = await response.json();

    // Get the first track from results
    const track = data.data && data.data.length > 0 ? data.data[0] : null;

    if (track) {
      console.log(`Found Deezer track: "${track.title}" by ${track.artist.name}`);

      // Verify that the track has a preview URL
      if (!track.preview) {
        console.warn(`Track found but has no preview URL: ${track.title}`);
      }

      // Cache the result
      searchCache[cacheKey] = track;
      return track;
    }

    // No track found with combined search, try with just artist
    console.warn(`No results for "${query}", trying with just artist name`);

    // Try with just the artist name
    const artistResponse = await fetch(`https://deezerdevs-deezer.p.rapidapi.com/search?q=${encodeURIComponent(artist)}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': 'e91bc1509cmsh7643f0470bb4185p1bc0ffjsnef20886dc679',
        'x-rapidapi-host': 'deezerdevs-deezer.p.rapidapi.com'
      }
    });

    if (artistResponse.ok) {
      const artistData = await artistResponse.json();
      if (artistData.data && artistData.data.length > 0) {
        // Found a track by the artist, use it
        const artistTrack = artistData.data[0];
        console.log(`Found track by artist: "${artistTrack.title}" by ${artistTrack.artist.name}`);

        // Verify that the track has a preview URL
        if (!artistTrack.preview) {
          console.warn(`Artist track found but has no preview URL: ${artistTrack.title}`);
        }

        // Cache the result
        searchCache[cacheKey] = artistTrack;
        return artistTrack;
      }
    }

    // If we get here, we couldn't find any track
    console.warn(`No Deezer tracks found for "${artist}" or "${title}"`);

    // Cache null result to avoid repeated failed searches
    searchCache[cacheKey] = null;
    return null;
  } catch (error) {
    console.error('Error searching Deezer track:', error);
    return null;
  }
}

/**
 * Get track details from Deezer by track ID
 * @param trackId The Deezer track ID
 * @returns The track details or null if not found
 */
export async function getDeezerTrack(trackId: string): Promise<any> {
  // Check cache first
  if (trackCache[trackId]) {
    return trackCache[trackId];
  }

  try {
    // Make API request to Deezer via RapidAPI
    const response = await fetch(`https://deezerdevs-deezer.p.rapidapi.com/track/${trackId}`, {
      method: 'GET',
      headers: {
        'x-rapidapi-key': 'e91bc1509cmsh7643f0470bb4185p1bc0ffjsnef20886dc679',
        'x-rapidapi-host': 'deezerdevs-deezer.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`Deezer API error: ${response.status}`);
    }

    const track = await response.json();

    // Cache the result
    trackCache[trackId] = track;

    return track;
  } catch (error) {
    console.error('Error getting Deezer track:', error);
    return null;
  }
}

/**
 * Get the URL for a Deezer album cover image
 * @param track The Deezer track object
 * @param size The desired size (small, medium, big, xl)
 * @returns The URL to the album cover image or empty string if not available
 */
export function getDeezerAlbumCover(track: any, size: 'small' | 'medium' | 'big' | 'xl' = 'big'): string {
  if (!track || !track.album) return '';

  switch (size) {
    case 'small':
      return track.album.cover_small || '';
    case 'medium':
      return track.album.cover_medium || '';
    case 'big':
      return track.album.cover_big || '';
    case 'xl':
      return track.album.cover_xl || '';
    default:
      return track.album.cover_big || '';
  }
}

/**
 * Get the preview URL for a Deezer track
 * @param track The Deezer track object
 * @returns The preview URL or empty string if not available
 */
export function getDeezerPreviewUrl(track: any): string {
  if (!track) {
    console.warn('getDeezerPreviewUrl called with null track');
    return '';
  }

  if (!track.preview) {
    console.warn(`Track ${track.title} has no preview URL`);
    return '';
  }

  return track.preview;
}

/**
 * Fallback function to get YouTube thumbnail if Deezer fails
 * @param youtubeId The YouTube video ID
 * @param quality The thumbnail quality
 * @returns The URL to the YouTube thumbnail
 */
export function getYouTubeFallbackThumbnail(youtubeId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  if (!youtubeId) return '';

  switch (quality) {
    case 'default':
      return `https://img.youtube.com/vi/${youtubeId}/default.jpg`;
    case 'medium':
      return `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`;
    case 'high':
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
    case 'standard':
      return `https://img.youtube.com/vi/${youtubeId}/sddefault.jpg`;
    case 'maxres':
      return `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;
    default:
      return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }
}
