/**
 * Utility functions for working with YouTube videos
 */

/**
 * Get the URL for a YouTube video thumbnail
 * @param videoId The YouTube video ID
 * @param quality The thumbnail quality (default, medium, high, standard, maxres)
 * @returns The URL to the thumbnail image
 */
export function getYouTubeThumbnailUrl(videoId: string, quality: 'default' | 'medium' | 'high' | 'standard' | 'maxres' = 'high'): string {
  if (!videoId) return '';
  
  switch (quality) {
    case 'default':
      return `https://img.youtube.com/vi/${videoId}/default.jpg`;
    case 'medium':
      return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
    case 'high':
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    case 'standard':
      return `https://img.youtube.com/vi/${videoId}/sddefault.jpg`;
    case 'maxres':
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    default:
      return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  }
}

/**
 * Check if a YouTube player is ready to play
 * @param player The YouTube player instance
 * @returns True if the player is ready to play
 */
export function isYouTubePlayerReady(player: any): boolean {
  return (
    player && 
    typeof player.getPlayerState === 'function' && 
    player.getPlayerState() !== -1 && // -1 = unstarted
    player.getPlayerState() !== 3     // 3 = buffering
  );
}
