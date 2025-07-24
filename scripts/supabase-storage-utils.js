// supabase-storage-utils.js - Compatible avec StackBlitz
// Utilitaires pour gérer les fichiers dans Supabase Storage

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // ou SUPABASE_SERVICE_ROLE_KEY si nécessaire

// Initialiser le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Télécharge un fichier depuis Storage
 * @param {string} bucketName - Nom du bucket
 * @param {string} filePath - Chemin du fichier dans le bucket
 * @returns {Promise<Blob|null>} - Le fichier sous forme de Blob ou null en cas d'erreur
 */
async function downloadFile(bucketName, filePath) {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .download(filePath);
    
    if (error) {
      console.error('Erreur lors du téléchargement:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erreur:', error);
    return null;
  }
}

/**
 * Télécharge et affiche un fichier texte depuis Storage
 * @param {string} bucketName - Nom du bucket
 * @param {string} filePath - Chemin du fichier dans le bucket
 */
async function viewTextFile(bucketName, filePath) {
  const blob = await downloadFile(bucketName, filePath);
  if (blob) {
    const text = await blob.text();
    console.log(`Contenu de ${filePath}:`, text);
  }
}

/**
 * Télécharge et propose le téléchargement d'un fichier dans le navigateur
 * @param {string} bucketName - Nom du bucket
 * @param {string} filePath - Chemin du fichier dans le bucket
 * @param {string} downloadName - Nom du fichier pour le téléchargement
 */
async function downloadFileToClient(bucketName, filePath, downloadName) {
  const blob = await downloadFile(bucketName, filePath);
  if (blob) {
    // Créer un lien de téléchargement
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadName || filePath.split('/').pop();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

/**
 * Téléverse un fichier dans Storage
 * @param {string} bucketName - Nom du bucket
 * @param {string} filePath - Chemin du fichier dans le bucket
 * @param {File|Blob} file - Fichier à téléverser
 * @param {Object} options - Options supplémentaires
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function uploadFile(bucketName, filePath, file, options = {}) {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        ...options
      });
    
    if (error) {
      console.error('Erreur lors du téléversement:', error);
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error };
  }
}

/**
 * Liste les fichiers dans un bucket
 * @param {string} bucketName - Nom du bucket
 * @param {string} folderPath - Chemin du dossier (optionnel)
 * @returns {Promise<Array|null>} - Liste des fichiers ou null en cas d'erreur
 */
async function listFiles(bucketName, folderPath = '') {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucketName)
      .list(folderPath);
    
    if (error) {
      console.error('Erreur lors de la liste des fichiers:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Erreur:', error);
    return null;
  }
}

/**
 * Supprime un fichier de Storage
 * @param {string} bucketName - Nom du bucket
 * @param {string} filePath - Chemin du fichier dans le bucket
 * @returns {Promise<boolean>} - true si supprimé avec succès, false sinon
 */
async function deleteFile(bucketName, filePath) {
  try {
    const { error } = await supabase
      .storage
      .from(bucketName)
      .remove([filePath]);
    
    if (error) {
      console.error('Erreur lors de la suppression:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Erreur:', error);
    return false;
  }
}

/**
 * Crée un bucket s'il n'existe pas déjà
 * @param {string} bucketName - Nom du bucket à créer
 * @param {Object} options - Options du bucket
 * @returns {Promise<Object>} - Résultat de l'opération
 */
async function createBucketIfNotExists(bucketName, options = { public: false }) {
  try {
    // Vérifier si le bucket existe
    const { data: buckets, error: listError } = await supabase
      .storage
      .listBuckets();
    
    if (listError) {
      console.error('Erreur lors de la liste des buckets:', listError);
      return { success: false, error: listError };
    }
    
    const bucketExists = buckets.some(bucket => bucket.name === bucketName);
    
    if (!bucketExists) {
      // Créer le bucket s'il n'existe pas
      const { data, error } = await supabase
        .storage
        .createBucket(bucketName, options);
      
      if (error) {
        console.error('Erreur lors de la création du bucket:', error);
        return { success: false, error };
      }
      
      console.log(`Bucket ${bucketName} créé avec succès`);
      return { success: true, data };
    }
    
    console.log(`Bucket ${bucketName} existe déjà`);
    return { success: true, exists: true };
  } catch (error) {
    console.error('Erreur:', error);
    return { success: false, error };
  }
}

// Exporter les fonctions
export {
  downloadFile,
  viewTextFile,
  downloadFileToClient,
  uploadFile,
  listFiles,
  deleteFile,
  createBucketIfNotExists
};