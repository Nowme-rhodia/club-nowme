// supabase-seed.js - Adapté pour StackBlitz
// Ce script permet de peupler votre base de données avec des données initiales

import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY; // ou SUPABASE_SERVICE_ROLE_KEY si nécessaire

// Initialiser le client Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Données de seed (à adapter selon vos besoins)
// Dans StackBlitz, nous définissons les données directement dans le script
// au lieu de les charger depuis un fichier
const seedData = {
  categories: [
    { name: 'Électronique', description: 'Produits électroniques et gadgets' },
    { name: 'Vêtements', description: 'Vêtements et accessoires' },
    { name: 'Alimentation', description: 'Produits alimentaires' },
  ],
  products: [
    { 
      name: 'Smartphone XYZ', 
      description: 'Dernier modèle avec caméra haute résolution', 
      price: 699.99, 
      category_id: 1 
    },
    { 
      name: 'T-shirt coton bio', 
      description: 'T-shirt en coton biologique', 
      price: 29.99, 
      category_id: 2 
    },
    { 
      name: 'Chocolat noir 85%', 
      description: 'Chocolat noir de qualité supérieure', 
      price: 4.99, 
      category_id: 3 
    },
  ],
  // Ajoutez d'autres tables selon vos besoins
};

// Option alternative: charger les données depuis Supabase Storage
async function loadSeedDataFromStorage() {
  try {
    const { data, error } = await supabase
      .storage
      .from('seed-data')
      .download('seed.json');
    
    if (error) throw error;
    
    // Convertir le blob en texte puis en JSON
    const text = await data.text();
    return JSON.parse(text);
  } catch (error) {
    console.error('Erreur lors du chargement des données depuis Storage:', error);
    // Fallback sur les données en dur
    return seedData;
  }
}

async function seedDatabase() {
  try {
    console.log('Début du seeding de la base de données...');
    
    // Option 1: Utiliser les données définies dans le script
    let data = seedData;
    
    // Option 2: Charger les données depuis Storage
    // Décommentez la ligne suivante pour utiliser cette option
    // data = await loadSeedDataFromStorage();
    
    // Insérer les données dans l'ordre pour respecter les contraintes de clés étrangères
    for (const [tableName, tableData] of Object.entries(data)) {
      console.log(`Insertion des données dans la table ${tableName}...`);
      
      const { data: insertedData, error } = await supabase
        .from(tableName)
        .insert(tableData)
        .select();
      
      if (error) {
        console.error(`Erreur lors de l'insertion dans ${tableName}:`, error);
      } else {
        console.log(`${insertedData.length} enregistrements insérés dans ${tableName}`);
      }
    }
    
    console.log('Seeding terminé avec succès!');
  } catch (error) {
    console.error('Erreur lors du seeding:', error);
  }
}

// Exécuter le script
seedDatabase();