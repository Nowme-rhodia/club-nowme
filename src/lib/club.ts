import { supabase } from './supabase';

// Types pour les fonctionnalités du club
export interface ClubEvent {
  id: string;
  title: string;
  description: string;
  event_type: 'discovery' | 'premium' | 'masterclass';
  date_time: string;
  location: string;
  max_participants: number;
  current_participants: number;
  price_discovery: number;
  price_premium: number;
  image_url?: string;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

export interface Masterclass {
  id: string;
  title: string;
  description: string;
  expert_name: string;
  expert_bio?: string;
  expert_photo_url?: string;
  date_time: string;
  duration_minutes: number;
  max_participants: number;
  current_participants: number;
  meeting_link?: string;
  category: string;
  status: 'upcoming' | 'live' | 'completed' | 'cancelled';
}

export interface ClubBox {
  id: string;
  name: string;
  description: string;
  quarter: string;
  year: number;
  estimated_value: number;
  contents: any[];
  image_url?: string;
  status: 'preparation' | 'shipping' | 'delivered' | 'cancelled';
}

export interface WellnessConsultation {
  id: string;
  consultant_name: string;
  consultant_specialty: string;
  consultation_type: 'phone' | 'video' | 'in_person';
  scheduled_date: string;
  duration_minutes: number;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  quarter_used: string;
}

export interface MemberRewards {
  id: string;
  points_earned: number;
  points_spent: number;
  points_balance: number;
  tier_level: 'bronze' | 'silver' | 'gold' | 'platinum';
  last_activity_date: string;
}

// Fonctions pour les événements
export async function getUpcomingEvents(): Promise<ClubEvent[]> {
  const { data, error } = await supabase
    .from('club_events')
    .select('*')
    .eq('status', 'upcoming')
    .gte('date_time', new Date().toISOString())
    .order('date_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function registerToEvent(eventId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-club-events', {
    body: {
      action: 'register_user',
      eventData: { eventId },
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
}

export async function cancelEventRegistration(eventId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-club-events', {
    body: {
      action: 'cancel_registration',
      eventData: { eventId },
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
}

export async function getUserEvents(): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('manage-club-events', {
    body: {
      action: 'get_user_events',
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
  return data?.events || [];
}

// Fonctions pour les masterclasses
export async function getUpcomingMasterclasses(): Promise<Masterclass[]> {
  const { data, error } = await supabase
    .from('masterclasses')
    .select('*')
    .eq('status', 'upcoming')
    .gte('date_time', new Date().toISOString())
    .order('date_time', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function registerToMasterclass(masterclassId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-masterclasses', {
    body: {
      action: 'register_user',
      masterclassData: { masterclassId },
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
}

export async function getUserMasterclasses(): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('manage-masterclasses', {
    body: {
      action: 'get_user_masterclasses',
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
  return data?.masterclasses || [];
}

// Fonctions pour les consultations bien-être
export async function checkConsultationEligibility(): Promise<{ eligible: boolean; quarter: string; message: string }> {
  const { data, error } = await supabase.functions.invoke('manage-wellness-consultations', {
    body: {
      action: 'check_quarterly_eligibility',
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
  return data;
}

export async function bookWellnessConsultation(consultationData: {
  consultantName: string;
  specialty: string;
  type: 'phone' | 'video' | 'in_person';
  scheduledDate: string;
  duration?: number;
}): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-wellness-consultations', {
    body: {
      action: 'book_consultation',
      consultationData,
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
}

export async function getUserConsultations(): Promise<WellnessConsultation[]> {
  const { data, error } = await supabase.functions.invoke('manage-wellness-consultations', {
    body: {
      action: 'get_user_consultations',
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
  return data?.consultations || [];
}

// Fonctions pour les box
export async function getUserBoxes(): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('manage-club-boxes', {
    body: {
      action: 'get_user_boxes',
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
  return data?.boxes || [];
}

export async function trackBoxShipment(shipmentId: string): Promise<any> {
  const { data, error } = await supabase.functions.invoke('manage-club-boxes', {
    body: {
      action: 'track_shipment',
      boxData: { shipmentId }
    }
  });

  if (error) throw error;
  return data?.shipment;
}

// Fonctions pour les récompenses
export async function getUserRewards(): Promise<MemberRewards & { tier_benefits: any; next_tier: string; points_to_next_tier: number }> {
  const { data, error } = await supabase.functions.invoke('manage-rewards', {
    body: {
      action: 'get_user_rewards',
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
  return data?.rewards;
}

export async function addRewardPoints(points: number, reason: string): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-rewards', {
    body: {
      action: 'add_points',
      rewardData: { points, reason },
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
}

export async function getAvailableRewards(): Promise<any[]> {
  const { data, error } = await supabase.functions.invoke('manage-rewards', {
    body: {
      action: 'get_available_rewards'
    }
  });

  if (error) throw error;
  return data?.rewards || [];
}

export async function redeemReward(rewardId: string): Promise<void> {
  const { error } = await supabase.functions.invoke('manage-rewards', {
    body: {
      action: 'redeem_reward',
      rewardData: { rewardId },
      userId: (await supabase.auth.getUser()).data.user?.id
    }
  });

  if (error) throw error;
}

// Fonctions utilitaires
export function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const quarter = Math.ceil(month / 3);
  return `Q${quarter}-${year}`;
}

export function isEventAccessible(event: ClubEvent, userSubscriptionType: 'discovery' | 'premium'): boolean {
  if (event.event_type === 'discovery') return true;
  if (event.event_type === 'premium' || event.event_type === 'masterclass') {
    return userSubscriptionType === 'premium';
  }
  return false;
}

export function calculateEventPrice(event: ClubEvent, userSubscriptionType: 'discovery' | 'premium'): number {
  return userSubscriptionType === 'premium' ? event.price_premium : event.price_discovery;
}