// src/lib/partner.ts
import { supabase } from './supabase';
import type { Database } from '@/types/supabase';

/**
 * Petits alias de confort pour taper les opérations Supabase
 */
type PublicTables = Database['public']['Tables'];
type Insert<T extends keyof PublicTables> = PublicTables[T]['Insert'];
type Row<T extends keyof PublicTables> = PublicTables[T]['Row'];
type Update<T extends keyof PublicTables> = PublicTables[T]['Update'];

/**
 * Interfaces côté UI (formulaires)
 * -> On garde un naming clair côté front
 */
export interface PartnerSubmission {
  business: {
    name: string;
    contactName: string;
    email: string;
    phone: string;          // ⚠ d’après tes types, phone est NOT NULL. On le rend requis côté front.
    address?: string;
    siret?: string;
    website?: string;
    description?: string;
    logoUrl?: string;
    openingHours?: Record<string, { open: string; close: string } | null>; // sera stocké en JSON si besoin
    social?: {
      instagram?: string;
      facebook?: string;
      tiktok?: string;
      youtube?: string;
      [k: string]: string | undefined;
    };
  };
}

export interface PartnerOfferForm {
  partnerId: string;
  title: string;
  description: string;
  categorySlug: string;
  subcategorySlug: string;
  location: string;
  coordinates?: { lat: number; lng: number }; // sera converti en [lng, lat] ou [lat, lng] selon ton schéma
}

/**
 * Utile : conversion {lat, lng} -> tuple attendu par PostGIS ou simple tuple [number, number]
 */
function toTuple(coords?: { lat: number; lng: number }): [number, number] | undefined {
  if (!coords) return undefined;
  // D’après ton type généré: coordinates?: [number, number] | null;
  // On choisit [lat, lng]. Si tu veux [lng, lat], inverse-les ici.
  return [coords.lat, coords.lng];
}

/**
 * 1) Création d’un PARTNER en "pending"
 *    - Typé avec Insert<'partners'> pour éviter le "never"
 *    - Mappe le camelCase (front) -> snake_case (DB)
 */
export async function submitPartnerApplication(submission: PartnerSubmission) {
  const payload: Insert<'partners'> = {
    // Colonnes d'après src/types/supabase.ts
    // required: business_name, contact_name, contact_email, phone, status
    business_name: submission.business.name,
    contact_name: submission.business.contactName,
    contact_email: submission.business.email,
    phone: submission.business.phone,
    website: submission.business.website ?? null,
    description: submission.business.description ?? null,
    logo_url: submission.business.logoUrl ?? null,
    address: submission.business.address ?? null,
    siret: submission.business.siret ?? null,
    opening_hours: submission.business.openingHours ?? null,
    social_media: submission.business.social ?? null,
    status: 'pending', // Enum: 'pending' | 'approved' | 'rejected'
    // created_at / updated_at: générés par la DB
  };

  const { data, error } = await supabase
    .from('partners')
    .insert(payload as any)
    .select('*')
    .single();

  if (error) {
    console.error('❌ submitPartnerApplication error:', error);
    throw error;
  }

  return data as Row<'partners'>;
}

/**
 * 2) Création d’une OFFER liée au partenaire
 *    - Typé avec Insert<'offers'>
 */
export async function createPartnerOffer(form: PartnerOfferForm) {
  const payload: Insert<'offers'> = {
    partner_id: form.partnerId,
    title: form.title,
    description: form.description,
    category_slug: form.categorySlug,
    subcategory_slug: form.subcategorySlug,
    location: form.location,
    coordinates: toTuple(form.coordinates),
    status: 'draft', // au choix: 'draft' au départ, puis 'pending' si tu veux validation
  };

  const { data, error } = await supabase
    .from('offers')
    .insert(payload as any)
    .select('*')
    .single();

  if (error) {
    console.error('❌ createPartnerOffer error:', error);
    throw error;
  }

  return data as Row<'offers'>;
}

/**
 * 3) Insérer un email à envoyer (table emails)
 *    - Typé Insert<'emails'>
 *    - status par défaut = 'pending' (si nullable/valeur par défaut en DB)
 */
export async function queueEmail(to: string, subject: string, htmlContent: string) {
  const emailPayload: Insert<'emails'> = {
    to_address: to,
    subject,
    content: htmlContent,
    status: 'pending', // d'après ton enum: 'pending' | 'sent' | 'failed'
  };

  const { data, error } = await supabase
    .from('emails')
    .insert(emailPayload as any)
    .select('*')
    .single();

  if (error) {
    console.error('❌ queueEmail error:', error);
    throw error;
  }

  return data as Row<'emails'>;
}

/**
 * 4) Changer le statut d’un partenaire (approve / reject)
 *    - On garde un helper commun
 */
async function updatePartnerStatus(partnerId: string, status: Row<'partners'>['status'], adminNotes?: string) {
  const payload: Update<'partners'> = {
    status,
    admin_notes: adminNotes ?? null,
  };

  const { data, error } = await supabase
    .from('partners')
    .update(payload as any)
    .eq('id', partnerId)
    .select('*')
    .single();

  if (error) {
    console.error(`❌ updatePartnerStatus(${status}) error:`, error);
    throw error;
  }

  return data as Row<'partners'>;
}

export async function approvePartner(partnerId: string, adminNotes?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    throw new Error('No active session');
  }

  const { data, error } = await supabase.functions.invoke('approve-partner', {
    body: { partnerId, adminNotes }
  });

  if (error) {
    console.error('❌ Error approving partner:', error);
    throw error;
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to approve partner');
  }

  // Retourner les données complètes incluant le mot de passe temporaire
  return {
    partner: data.partner,
    tempPassword: data.tempPassword
  };
}

export function rejectPartner(partnerId: string, adminNotes?: string) {
  return updatePartnerStatus(partnerId, 'rejected', adminNotes);
}
