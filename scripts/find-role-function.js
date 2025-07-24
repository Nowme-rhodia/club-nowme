#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';

async function findRoleFunction() {
  console.log('🔍 Recherche de la fonction role() dans les migrations...');
  console.log('=' .repeat(60));

  try {
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();

    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Chercher les occurrences de role()
      if (content.includes('role()')) {
        console.log(`\n📄 Fichier: ${file}`);
        console.log('-'.repeat(40));
        
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('role()')) {
            console.log(`Ligne ${index + 1}: ${line.trim()}`);
          }
        });
      }
    }

    console.log('\n🔧 CORRECTION NÉCESSAIRE:');
    console.log('La fonction role() doit être remplacée par:');
    console.log('- auth.jwt() ->> \'role\' pour récupérer le rôle depuis le JWT');
    console.log('- ou une autre approche selon le contexte');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

findRoleFunction();