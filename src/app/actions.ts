'use server';

import { supabase } from '@/lib/supabaseClient';

export async function submitScoreAction(name: string, score: number): Promise<{ success: boolean; message: string }> {
  if (!name || typeof score !== 'number') {
    return { success: false, message: 'Ogiltigt namn eller poäng.' };
  }

  try {
    const { error } = await supabase
      .from('leaderboard')
      .insert([{ name: name, score: score }]);

    if (error) {
      throw new Error(error.message || 'Databasfel vid insättning.');
    }

    return {
      success: true,
      message: 'Poäng skickad till topplistan!'
    };
  } catch (error: any) {
    console.error('Server Action error:', error);
    return {
      success: false,
      message: `Kunde inte skicka poäng: ${error.message}`
    };
  }
}
