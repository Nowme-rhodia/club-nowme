import { supabase } from './supabase';

// ---------- TYPES ----------

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

// ---------- ÉVÉNEMENTS ----------

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
  const user = await getUserProfileId();
  const { error } = await supabase
    .from('event_registrations')
    .insert({ event_id: eventId, user_id: user });
  if (error) throw error;
}

export async function cancelEventRegistration(eventId: string): Promise<void> {
  const user = await getUserProfileId();
  const { error } = await supabase
    .from('event_registrations')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', user);
  if (error) throw error;
}

export async function getUserEvents(): Promise<any[]> {
  const user = await getUserProfileId();
  const { data, error } = await supabase
    .from('event_registrations')
    .select('*, event:club_events(*)')
    .eq('user_id', user)
    .order('registration_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------- MASTERCLASSES ----------

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
  const user = await getUserProfileId();
  const { error } = await supabase
    .from('masterclass_attendees')
    .insert({ masterclass_id: masterclassId, user_id: user });
  if (error) throw error;
}

export async function getUserMasterclasses(): Promise<any[]> {
  const user = await getUserProfileId();
  const { data, error } = await supabase
    .from('masterclass_attendees')
    .select('*, masterclass:masterclasses(*)')
    .eq('user_id', user)
    .order('registration_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------- CONSULTATIONS ----------

export async function checkConsultationEligibility(): Promise<{ eligible: boolean; quarter: string; message: string }> {
  const { id, subscription_type } = await getUserProfile();
  if (subscription_type !== 'premium') {
    return {
      eligible: false,
      quarter: getCurrentQuarter(),
      message: 'Consultations réservées aux membres premium'
    };
  }

  const quarter = getCurrentQuarter();
  const { data: consultation, error } = await supabase
    .from('wellness_consultations')
    .select('id')
    .eq('user_id', id)
    .eq('quarter_used', quarter)
    .eq('status', 'completed')
    .single();

  const eligible = !consultation;
  return {
    eligible,
    quarter,
    message: eligible
      ? 'Vous pouvez réserver votre consultation gratuite'
      : 'Consultation déjà utilisée ce trimestre'
  };
}

export async function bookWellnessConsultation(consultationData: {
  consultantName: string;
  specialty: string;
  type: 'phone' | 'video' | 'in_person';
  scheduledDate: string;
  duration?: number;
}): Promise<void> {
  const user = await getUserProfileId();
  const { error } = await supabase
    .from('wellness_consultations')
    .insert({
      user_id: user,
      consultant_name: consultationData.consultantName,
      consultant_specialty: consultationData.specialty,
      consultation_type: consultationData.type,
      scheduled_date: consultationData.scheduledDate,
      duration_minutes: consultationData.duration || 45,
      quarter_used: getCurrentQuarter()
    });
  if (error) throw error;
}

export async function getUserConsultations(): Promise<WellnessConsultation[]> {
  const user = await getUserProfileId();
  const { data, error } = await supabase
    .from('wellness_consultations')
    .select('*')
    .eq('user_id', user)
    .order('scheduled_date', { ascending: false });
  if (error) throw error;
  return data || [];
}

// ---------- BOXES ----------

export async function getUserBoxes(): Promise<any[]> {
  const user = await getUserProfileId();
  const { data, error } = await supabase
    .from('box_shipments')
    .select('*, box:club_boxes(*)')
    .eq('user_id', user)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function trackBoxShipment(shipmentId: string): Promise<any> {
  const { data, error } = await supabase
    .from('box_shipments')
    .select('*, box:club_boxes(*)')
    .eq('id', shipmentId)
    .single();
  if (error) throw error;
  return data;
}

// ---------- RÉCOMPENSES ----------

export async function getUserRewards(): Promise<MemberRewards & { tier_benefits: any; next_tier: string; points_to_next_tier: number }> {
  const user = await getUserProfileId();
  const { data, error } = await supabase
    .from('member_rewards')
    .select('*')
    .eq('user_id', user)
    .single();
  if (error) throw error;

  const tierBenefits = getTierBenefits(data.tier_level);
  const nextTier = getNextTier(data.tier_level);
  const pointsToNextTier = nextTier ? getTierThreshold(nextTier) - data.points_earned : 0;

  return {
    ...data,
    tier_benefits: tierBenefits,
    next_tier: nextTier,
    points_to_next_tier: pointsToNextTier
  };
}

export async function addRewardPoints(points: number, reason: string): Promise<void> {
  const user = await getUserProfileId();
  const { data, error } = await supabase
    .from('member_rewards')
    .select('*')
    .eq('user_id', user)
    .single();
  if (error) throw error;

  const updated = {
    points_earned: data.points_earned + points,
    points_balance: data.points_balance + points,
    tier_level: calculateTier(data.points_earned + points),
    last_activity_date: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('member_rewards')
    .update(updated)
    .eq('user_id', user);
  if (updateError) throw updateError;
}

// ---------- UTILS ----------

function getTierBenefits(tier: string) {
  const benefits = {
    bronze: { discount: 0, description: "Bienvenue dans le club !" },
    silver: { discount: 5, description: "5% de réduction supplémentaire" },
    gold: { discount: 10, description: "10% de réduction supplémentaire + accès prioritaire" },
    platinum: { discount: 15, description: "15% de réduction supplémentaire + avantages VIP" }
  };
  return benefits[tier] || benefits.bronze;
}

function getNextTier(currentTier: string): string | null {
  const tiers = ['bronze', 'silver', 'gold', 'platinum'];
  const index = tiers.indexOf(currentTier);
  return index < tiers.length - 1 ? tiers[index + 1] : null;
}

function getTierThreshold(tier: string): number {
  return { bronze: 0, silver: 500, gold: 1500, platinum: 3000 }[tier] || 0;
}

function calculateTier(points: number): string {
  if (points >= 3000) return 'platinum';
  if (points >= 1500) return 'gold';
  if (points >= 500) return 'silver';
  return 'bronze';
}

export function getCurrentQuarter(): string {
  const now = new Date();
  const year = now.getFullYear();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter}-${year}`;
}

export function isEventAccessible(event: ClubEvent, subscription: 'monthly' | 'yearly') {
  // Tous les événements sont accessibles pour tous les membres actifs
  return true;
}

export function calculateEventPrice(event: ClubEvent, subscription: 'monthly' | 'yearly') {
  // Prix membre pour tous, avec bonus pour les membres annuels
  const basePrice = event.price_premium || 0;
  
  // Les membres annuels ont des réductions supplémentaires
  if (subscription === 'yearly') {
    return Math.max(0, basePrice * 0.8); // 20% de réduction supplémentaire
  }
  
  return basePrice;
}

// ---------- HELPERS ----------

async function getUserProfileId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (error) throw error;
  return data.id;
}

async function getUserProfile(): Promise<{ id: string; subscription_type: string }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, subscription_type')
    .eq('user_id', user.id)
    .single();
  if (error) throw error;
  return data;
}
