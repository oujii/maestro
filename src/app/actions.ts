'use server';

import { supabase } from '@/lib/supabaseClient';

export async function submitScoreAction(name: string, score: number): Promise<{ success: boolean; message: string }> {
  if (!name || typeof score !== 'number') {
    return { success: false, message: 'Ogiltigt namn eller poäng.' };
  }

  try {
    // Använd svensk tidszon för att spara rätt datum
    const stockholmDate = new Date().toLocaleString("en-CA", {
      timeZone: "Europe/Stockholm",
      year: "numeric",
      month: "2-digit", 
      day: "2-digit"
    }); // Format: YYYY-MM-DD
    
    const { error } = await supabase
      .from('leaderboard')
      .insert([{ 
        name: name, 
        score: score,
        quiz_date: stockholmDate
      }]);

    if (error) {
      throw new Error(error.message || 'Databasfel vid insättning.');
    }

    return {
      success: true,
      message: 'Poäng skickad till topplistan! Du kan se din placering genom att klicka på 🏆-ikonen.'
    };
  } catch (error: any) {
    console.error('Server Action error:', error);
    return {
      success: false,
      message: `Kunde inte skicka poäng: ${error.message}`
    };
  }
}
