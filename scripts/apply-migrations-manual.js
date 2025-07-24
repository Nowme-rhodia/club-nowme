// apply-migrations-manual.js - Version StackBlitz
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || window.env?.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || window.env?.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigrationsManual() {
  console.log('🚀 Application manuelle des migrations Supabase');
  console.log('================================================');
  
  if (!supabaseUrl || !serviceKey) {
    console.error('❌ Variables d\'environnement manquantes:');
    console.error('   - VITE_SUPABASE_URL ou window.env.SUPABASE_URL');
    console.error('   - SUPABASE_SERVICE_ROLE_KEY ou window.env.SUPABASE_SERVICE_ROLE_KEY');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  try {
    // Test de connexion
    const { data, error } = await supabase
      .from('user_profiles')
      .select('count')
      .limit(1);

    if (error && error.code !== '42P01') {
      throw new Error(`Connexion échouée: ${error.message}`);
    }

    console.log('✅ Connexion Supabase réussie');

    // Dans StackBlitz, nous ne pouvons pas accéder au système de fichiers
    // Nous allons donc charger les migrations depuis Supabase Storage
    
    try {
      const { data: migrations, error: storageError } = await supabase
        .storage
        .from('migrations')
        .list();
      
      if (storageError) throw storageError;
      
      if (!migrations || migrations.length === 0) {
        console.log('⚠️ Aucun fichier de migration trouvé dans le bucket "migrations"');
        return;
      }
      
      const sqlFiles = migrations
        .filter(file => file.name.endsWith('.sql'))
        .sort((a, b) => a.name.localeCompare(b.name));
      
      console.log(`📦 ${sqlFiles.length} fichiers de migration trouvés`);
      console.log('');

      // Afficher les instructions pour chaque migration
      for (const file of sqlFiles) {
        console.log(`📄 Migration: ${file.name}`);
        console.log('─'.repeat(50));
        
        // Télécharger le contenu du fichier
        const { data: fileData, error: fileError } = await supabase
          .storage
          .from('migrations')
          .download(file.name);
        
        if (fileError) {
          console.error(`Erreur lors du téléchargement de ${file.name}:`, fileError);
          continue;
        }
        
        const sql = await fileData.text();
        
        // Extraire le commentaire de description s'il existe
        const lines = sql.split('\n');
        const commentLines = [];
        let inComment = false;
        
        for (const line of lines) {
          if (line.trim().startsWith('/*')) {
            inComment = true;
          }
          if (inComment) {
            commentLines.push(line);
          }
          if (line.trim().endsWith('*/')) {
            inComment = false;
            break;
          }
        }

        if (commentLines.length > 0) {
          console.log('📝 Description:');
          commentLines.forEach(line => {
            console.log(`   ${line.replace(/^\/\*|\*\/$/g, '').trim()}`);
          });
        }

        console.log('');
        console.log('🔧 Instructions:');
        console.log('   1. Ouvrir le dashboard Supabase');
        console.log('   2. Aller dans SQL Editor');
        console.log('   3. Copier-coller le contenu du fichier:');
        
        // Créer un élément textarea pour afficher et copier le SQL
        const textarea = document.createElement('textarea');
        textarea.value = sql;
        textarea.style.width = '100%';
        textarea.style.height = '200px';
        textarea.style.marginTop = '10px';
        textarea.style.marginBottom = '10px';
        document.body.appendChild(textarea);
        
        // Bouton pour copier le SQL
        const copyButton = document.createElement('button');
        copyButton.textContent = 'Copier le SQL';
        copyButton.onclick = () => {
          textarea.select();
          document.execCommand('copy');
          alert('SQL copié dans le presse-papier!');
        };
        document.body.appendChild(copyButton);
        
        console.log('   4. Exécuter la requête');
        console.log('');
        console.log('🌐 Dashboard: https://supabase.com/dashboard/project/dqfyuhwrjozoxadkccdj/sql');
        console.log('');
        console.log('═'.repeat(70));
        console.log('');
      }

      console.log('✅ Instructions générées pour toutes les migrations');
      console.log('');
      console.log('💡 Conseil: Appliquez les migrations dans l\'ordre chronologique');
      console.log('💡 Vérifiez que chaque migration s\'exécute sans erreur avant de passer à la suivante');

    } catch (storageError) {
      console.error('❌ Erreur lors de l\'accès au stockage:', storageError.message);
      console.log('');
      console.log('💡 Assurez-vous d\'avoir créé un bucket "migrations" dans Supabase Storage');
      console.log('💡 et d\'y avoir téléversé vos fichiers SQL de migration');
    }

  } catch (error) {
    console.error('❌ Erreur:', error.message);
  }
}

// Interface utilisateur pour StackBlitz
function createUI() {
  const container = document.createElement('div');
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.maxWidth = '800px';
  container.style.margin = '20px auto';
  container.style.padding = '20px';
  container.style.border = '1px solid #ddd';
  container.style.borderRadius = '5px';
  
  const title = document.createElement('h2');
  title.textContent = 'Application manuelle des migrations Supabase';
  container.appendChild(title);
  
  const description = document.createElement('p');
  description.textContent = 'Cet outil vous aide à appliquer manuellement les migrations Supabase en affichant les instructions et le SQL à exécuter.';
  container.appendChild(description);
  
  const runButton = document.createElement('button');
  runButton.textContent = 'Charger les migrations';
  runButton.style.padding = '10px 20px';
  runButton.style.backgroundColor = '#3ECF8E';
  runButton.style.color = 'white';
  runButton.style.border = 'none';
  runButton.style.borderRadius = '5px';
  runButton.style.cursor = 'pointer';
  runButton.style.fontSize = '16px';
  runButton.onclick = applyMigrationsManual;
  container.appendChild(runButton);
  
  const outputDiv = document.createElement('div');
  outputDiv.id = 'migration-output';
  outputDiv.style.marginTop = '20px';
  outputDiv.style.padding = '10px';
  outputDiv.style.backgroundColor = '#f5f5f5';
  outputDiv.style.borderRadius = '5px';
  outputDiv.style.whiteSpace = 'pre-wrap';
  container.appendChild(outputDiv);
  
  // Rediriger la console vers notre div
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  console.log = function() {
    const args = Array.from(arguments);
    originalConsoleLog.apply(console, args);
    outputDiv.innerHTML += args.join(' ') + '<br>';
  };
  
  console.error = function() {
    const args = Array.from(arguments);
    originalConsoleError.apply(console, args);
    outputDiv.innerHTML += '<span style="color: red;">' + args.join(' ') + '</span><br>';
  };
  
  document.body.appendChild(container);
}

// Exécuter l'interface utilisateur si nous sommes dans un navigateur
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', createUI);
}