// supabase-auth-utils.js - Compatible avec StackBlitz
// Utilitaires pour gérer l'authentification Supabase

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Initialiser le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * S'inscrire avec email et mot de passe
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @param {Object} metadata - Métadonnées utilisateur (optionnel)
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function signUp(email, password, metadata = {}) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata
      }
    });
    
    if (error) {
      console.error('Erreur lors de l\'inscription:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error };
  }
}

/**
 * Se connecter avec email et mot de passe
 * @param {string} email - Email de l'utilisateur
 * @param {string} password - Mot de passe
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      console.error('Erreur lors de la connexion:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error };
  }
}

/**
 * Se déconnecter
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Erreur lors de la déconnexion:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error };
  }
}

/**
 * Récupérer l'utilisateur actuellement connecté
 * @returns {Promise<Object>} - Utilisateur actuel ou null
 */
async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Erreur lors de la récupération de l\'utilisateur:', error);
      return null;
    }
    
    return user;
  } catch (error) {
    console.error('Erreur:', error);
    return null;
  }
}

/**
 * Mettre à jour les métadonnées de l'utilisateur
 * @param {Object} metadata - Nouvelles métadonnées
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function updateUserMetadata(metadata) {
  try {
    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });
    
    if (error) {
      console.error('Erreur lors de la mise à jour des métadonnées:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error };
  }
}

/**
 * Envoyer un lien de réinitialisation de mot de passe
 * @param {string} email - Email de l'utilisateur
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function resetPassword(email) {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      console.error('Erreur lors de l\'envoi du lien de réinitialisation:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error };
  }
}

/**
 * Se connecter avec un fournisseur OAuth
 * @param {string} provider - Fournisseur OAuth (google, facebook, github, etc.)
 * @returns {Promise<void>}
 */
async function signInWithProvider(provider) {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin
      }
    });
    
    if (error) {
      console.error(`Erreur lors de la connexion avec ${provider}:`, error);
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
}

/**
 * Vérifier si l'utilisateur a un rôle spécifique
 * @param {string} role - Rôle à vérifier
 * @returns {Promise<boolean>} - true si l'utilisateur a le rôle, false sinon
 */
async function hasRole(role) {
  const user = await getCurrentUser();
  if (!user) return false;
  
  // Vérifier dans app_metadata.roles (tableau de rôles)
  const roles = user.app_metadata?.roles || [];
  return roles.includes(role);
}

// Exporter les fonctions
export {
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  updateUserMetadata,
  resetPassword,
  signInWithProvider,
  hasRole
};