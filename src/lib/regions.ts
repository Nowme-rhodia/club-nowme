import { supabase } from './supabase';

export async function submitRegionRequest(email: string, region: string) {
  try {
    const { error } = await supabase
      .from('region_requests')
      .insert({
        email,
        region
      });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error submitting region request:', error);
    throw error;
  }
}