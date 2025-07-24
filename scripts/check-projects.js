// check-projects.js - Version StackBlitz
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || window.env?.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || window.env?.VITE_SUPABASE_ANON_KEY;

// Options par défaut
let options = {
  verbose: false
};

// Projet actuel
const projects = {
  production: {
    id: 'dqfyuhwrjozoxadkccdj',
    url: 'https://dqfyuhwrjozoxadkccdj.supabase.co'
  }
  // Vous pouvez ajouter d'autres projets si nécessaire
};

async function checkProjects() {
  try {
    console.log('🔍 Vérification des projets Supabase');
    console.log('═'.repeat(40));

    // Créer un tableau HTML pour les résultats
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '20px';
    
    // En-tête du tableau
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['Environnement', 'ID Projet', 'Statut', 'Détails'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      th.style.border = '1px solid #ddd';
      th.style.padding = '8px';
      th.style.backgroundColor = '#f2f2f2';
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);
    
    // Corps du tableau
    const tbody = document.createElement('tbody');

    for (const [env, project] of Object.entries(projects)) {
      try {
        // Essayer d'abord avec la clé de service spécifique à l'environnement
        const serviceKey = process.env[`SUPABASE_${env.toUpperCase()}_SERVICE_KEY`] || 
                          window.env?.[`SUPABASE_${env.toUpperCase()}_SERVICE_KEY`];
        const anonKey = supabaseKey;
        
        if (!serviceKey && !anonKey) {
          console.log(`⚠️ ${env.padEnd(12)} (${project.id}) - Pas de clé disponible`);
          
          const row = document.createElement('tr');
          
          const envCell = document.createElement('td');
          envCell.textContent = env;
          envCell.style.border = '1px solid #ddd';
          envCell.style.padding = '8px';
          row.appendChild(envCell);
          
          const idCell = document.createElement('td');
          idCell.textContent = project.id;
          idCell.style.border = '1px solid #ddd';
          idCell.style.padding = '8px';
          row.appendChild(idCell);
          
          const statusCell = document.createElement('td');
          statusCell.textContent = '⚠️ Pas de clé disponible';
          statusCell.style.border = '1px solid #ddd';
          statusCell.style.padding = '8px';
          statusCell.style.color = 'orange';
          row.appendChild(statusCell);
          
          const detailsCell = document.createElement('td');
          detailsCell.textContent = 'Impossible de tester la connexion';
          detailsCell.style.border = '1px solid #ddd';
          detailsCell.style.padding = '8px';
          row.appendChild(detailsCell);
          
          tbody.appendChild(row);
          continue;
        }
        
        const key = serviceKey || anonKey;
        const keyType = serviceKey ? 'SERVICE_ROLE' : 'ANON';
        
        if (options.verbose) {
          console.log(`ℹ️ ${env.padEnd(12)} - Utilisation de la clé ${keyType}`);
        }

        const supabase = createClient(project.url, key);

        // Test de connexion
        const { data, error } = await supabase.from('user_profiles').select('count');
        
        const row = document.createElement('tr');
        
        const envCell = document.createElement('td');
        envCell.textContent = env;
        envCell.style.border = '1px solid #ddd';
        envCell.style.padding = '8px';
        row.appendChild(envCell);
        
        const idCell = document.createElement('td');
        idCell.textContent = project.id;
        idCell.style.border = '1px solid #ddd';
        idCell.style.padding = '8px';
        row.appendChild(idCell);
        
        const statusCell = document.createElement('td');
        const detailsCell = document.createElement('td');
        detailsCell.style.border = '1px solid #ddd';
        detailsCell.style.padding = '8px';
        
        if (error && error.code === '42P01') {
          console.log(`✓ ${env.padEnd(12)} (${project.id}) - Connexion OK (table non trouvée)`);
          statusCell.textContent = '✓ Connexion OK';
          statusCell.style.color = 'green';
          detailsCell.textContent = 'Table non trouvée (normal si elle n\'existe pas)';
        } else if (error) {
          console.log(`⚠️ ${env.padEnd(12)} (${project.id}) - Erreur: ${error.message}`);
          statusCell.textContent = '⚠️ Erreur';
          statusCell.style.color = 'red';
          detailsCell.textContent = error.message;
        } else {
          console.log(`✓ ${env.padEnd(12)} (${project.id}) - Connexion OK`);
          statusCell.textContent = '✓ Connexion OK';
          statusCell.style.color = 'green';
          
          const detailsList = document.createElement('ul');
          detailsList.style.margin = '0';
          detailsList.style.paddingLeft = '20px';
          
          if (options.verbose) {
            // Vérifier les fonctions Edge
            try {
              const { data: functions, error: fnError } = await supabase.functions.list();
              if (!fnError && functions) {
                console.log(`  ├─ 📦 ${functions.length} fonctions Edge trouvées`);
                const item = document.createElement('li');
                item.textContent = `${functions.length} fonctions Edge trouvées`;
                detailsList.appendChild(item);
              }
            } catch (e) {
              console.log(`  ├─ ⚠️ Impossible de lister les fonctions Edge`);
              const item = document.createElement('li');
              item.textContent = 'Impossible de lister les fonctions Edge';
              item.style.color = 'orange';
              detailsList.appendChild(item);
            }
            
            // Vérifier le stockage
            try {
              const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
              if (!storageError && buckets) {
                console.log(`  └─ 🗂️ ${buckets.length} buckets de stockage trouvés`);
                const item = document.createElement('li');
                item.textContent = `${buckets.length} buckets de stockage trouvés`;
                detailsList.appendChild(item);
              }
            } catch (e) {
              console.log(`  └─ ⚠️ Impossible de lister les buckets de stockage`);
              const item = document.createElement('li');
              item.textContent = 'Impossible de lister les buckets de stockage';
              item.style.color = 'orange';
              detailsList.appendChild(item);
            }
            
            detailsCell.appendChild(detailsList);
          } else {
            detailsCell.textContent = 'Connexion réussie';
          }
        }
        
        statusCell.style.border = '1px solid #ddd';
        statusCell.style.padding = '8px';
        row.appendChild(statusCell);
        row.appendChild(detailsCell);
        
        tbody.appendChild(row);
      } catch (error) {
        console.log(`✗ ${env.padEnd(12)} (${project.id}) - Erreur de connexion: ${error.message}`);
        
        const row = document.createElement('tr');
        
        const envCell = document.createElement('td');
        envCell.textContent = env;
        envCell.style.border = '1px solid #ddd';
        envCell.style.padding = '8px';
        row.appendChild(envCell);
        
        const idCell = document.createElement('td');
        idCell.textContent = project.id;
        idCell.style.border = '1px solid #ddd';
        idCell.style.padding = '8px';
        row.appendChild(idCell);
        
        const statusCell = document.createElement('td');
        statusCell.textContent = '✗ Erreur de connexion';
        statusCell.style.border = '1px solid #ddd';
        statusCell.style.padding = '8px';
        statusCell.style.color = 'red';
        row.appendChild(statusCell);
        
        const detailsCell = document.createElement('td');
        detailsCell.textContent = error.message;
        detailsCell.style.border = '1px solid #ddd';
        detailsCell.style.padding = '8px';
        row.appendChild(detailsCell);
        
        tbody.appendChild(row);
      }
    }
    
    table.appendChild(tbody);
    document.getElementById('projects-output').appendChild(table);

    console.log('═'.repeat(40));
    console.log('✅ Vérification terminée');

  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  }
}

// Interface utilisateur pour StackBlitz
function createUI() {
  const container = document.createElement('div');
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.maxWidth = '1000px';
  container.style.margin = '20px auto';
  container.style.padding = '20px';
  container.style.border = '1px solid #ddd';
  container.style.borderRadius = '5px';
  
  const title = document.createElement('h2');
  title.textContent = 'Vérification des projets Supabase';
  container.appendChild(title);
  
  const description = document.createElement('p');
  description.textContent = 'Cet outil vous permet de vérifier l\'état de vos projets Supabase.';
  container.appendChild(description);
  
  // Options
  const optionsDiv = document.createElement('div');
  optionsDiv.style.marginBottom = '20px';
  
  const verboseLabel = document.createElement('label');
  verboseLabel.style.display = 'flex';
  verboseLabel.style.alignItems = 'center';
  verboseLabel.style.marginBottom = '10px';
  
  const verboseCheckbox = document.createElement('input');
  verboseCheckbox.type = 'checkbox';
  verboseCheckbox.id = 'verbose';
  verboseCheckbox.style.marginRight = '10px';
  verboseCheckbox.addEventListener('change', (e) => {
    options.verbose = e.target.checked;
  });
  verboseLabel.appendChild(verboseCheckbox);
  
  const verboseText = document.createElement('span');
  verboseText.textContent = 'Afficher plus de détails';
  verboseLabel.appendChild(verboseText);
  
  optionsDiv.appendChild(verboseLabel);
  
  // Bouton de vérification
  const checkButton = document.createElement('button');
  checkButton.textContent = 'Vérifier les projets';
  checkButton.style.padding = '10px 20px';
  checkButton.style.backgroundColor = '#3ECF8E';
  checkButton.style.color = 'white';
  checkButton.style.border = 'none';
  checkButton.style.borderRadius = '5px';
  checkButton.style.cursor = 'pointer';
  checkButton.onclick = () => {
    // Effacer les résultats précédents
    const outputDiv = document.getElementById('projects-output');
    outputDiv.innerHTML = '';
    const consoleOutput = document.getElementById('console-output');
    consoleOutput.innerHTML = '';
    
    // Exécuter la vérification
    checkProjects();
  };
  optionsDiv.appendChild(checkButton);
  
  container.appendChild(optionsDiv);
  
  // Div pour les résultats
  const outputDiv = document.createElement('div');
  outputDiv.id = 'projects-output';
  container.appendChild(outputDiv);
  
  // Rediriger la console vers notre div
  const consoleOutput = document.createElement('div');
  consoleOutput.id = 'console-output';
  consoleOutput.style.marginTop = '20px';
  consoleOutput.style.padding = '10px';
  consoleOutput.style.backgroundColor = '#f5f5f5';
  consoleOutput.style.borderRadius = '5px';
  consoleOutput.style.whiteSpace = 'pre-wrap';
  container.appendChild(consoleOutput);
  
  const originalConsoleLog = console.log;
  const originalConsoleError = console.error;
  
  console.log = function() {
    const args = Array.from(arguments);
    originalConsoleLog.apply(console, args);
    consoleOutput.innerHTML += args.join(' ') + '<br>';
  };
  
  console.error = function() {
    const args = Array.from(arguments);
    originalConsoleError.apply(console, args);
    consoleOutput.innerHTML += '<span style="color: red;">' + args.join(' ') + '</span><br>';
  };
  
  document.body.appendChild(container);
}

// Exécuter l'interface utilisateur si nous sommes dans un navigateur
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', createUI);
}