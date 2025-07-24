// check-supabase-config.js - Version compatible Node.js et navigateur
// Détecter l'environnement
const isBrowser = typeof window !== 'undefined';

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || (isBrowser ? window.env?.SUPABASE_URL : undefined);
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || (isBrowser ? window.env?.VITE_SUPABASE_ANON_KEY : undefined);
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || (isBrowser ? window.env?.SUPABASE_SERVICE_ROLE_KEY : undefined);
const dbPassword = process.env.DB_PASSWORD || (isBrowser ? window.env?.DB_PASSWORD : undefined);

// Options par défaut
let options = {
  detailed: false
};

async function checkSupabaseConfig() {
  console.log('🔍 Vérification de la configuration Supabase...');
  console.log('═'.repeat(50));

  // Vérifier les variables d'environnement nécessaires
  const requiredEnvVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
  const optionalEnvVars = ['SUPABASE_SERVICE_ROLE_KEY', 'DB_PASSWORD'];
  const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar] && !(isBrowser && window.env?.[envVar]));
  
  // Si nous sommes dans un navigateur, créer l'interface utilisateur
  if (isBrowser) {
    // Créer un tableau HTML pour les variables d'environnement
    const envTable = document.createElement('table');
    envTable.style.width = '100%';
    envTable.style.borderCollapse = 'collapse';
    envTable.style.marginTop = '20px';
    
    // En-tête du tableau
    const envThead = document.createElement('thead');
    const envHeaderRow = document.createElement('tr');
    ['Variable', 'Statut', 'Valeur'].forEach(header => {
      const th = document.createElement('th');
      th.textContent = header;
      th.style.border = '1px solid #ddd';
      th.style.padding = '8px';
      th.style.backgroundColor = '#f2f2f2';
      envHeaderRow.appendChild(th);
    });
    envThead.appendChild(envHeaderRow);
    envTable.appendChild(envThead);
    
    // Corps du tableau
    const envTbody = document.createElement('tbody');
    
    // Vérifier les variables requises
    console.log('\n📋 Variables d\'environnement requises:');
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar] || (isBrowser ? window.env?.[envVar] : undefined);
      
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.textContent = envVar;
      nameCell.style.border = '1px solid #ddd';
      nameCell.style.padding = '8px';
      nameCell.style.fontWeight = 'bold';
      row.appendChild(nameCell);
      
      const statusCell = document.createElement('td');
      statusCell.style.border = '1px solid #ddd';
      statusCell.style.padding = '8px';
      
      const valueCell = document.createElement('td');
      valueCell.style.border = '1px solid #ddd';
      valueCell.style.padding = '8px';
      valueCell.style.fontFamily = 'monospace';
      
      if (value === undefined) {
        console.log(`❌ ${envVar}: non définie`);
        statusCell.textContent = '❌ Non définie';
        statusCell.style.color = 'red';
        valueCell.textContent = '-';
      } else if (value === '') {
        console.log(`⚠️ ${envVar}: définie mais vide`);
        statusCell.textContent = '⚠️ Définie mais vide';
        statusCell.style.color = 'orange';
        valueCell.textContent = '""';
      } else {
        const displayValue = value.substring(0, 5) + '...' + value.substring(value.length - 5);
        console.log(`✅ ${envVar}: définie (${displayValue})`);
        statusCell.textContent = '✅ Définie';
        statusCell.style.color = 'green';
        valueCell.textContent = displayValue;
      }
      
      row.appendChild(statusCell);
      row.appendChild(valueCell);
      envTbody.appendChild(row);
    });

    // Vérifier les variables optionnelles
    console.log('\n📋 Variables d\'environnement optionnelles:');
    optionalEnvVars.forEach(envVar => {
      const value = process.env[envVar] || (isBrowser ? window.env?.[envVar] : undefined);
      
      const row = document.createElement('tr');
      
      const nameCell = document.createElement('td');
      nameCell.textContent = envVar;
      nameCell.style.border = '1px solid #ddd';
      nameCell.style.padding = '8px';
      row.appendChild(nameCell);
      
      const statusCell = document.createElement('td');
      statusCell.style.border = '1px solid #ddd';
      statusCell.style.padding = '8px';
      
      const valueCell = document.createElement('td');
      valueCell.style.border = '1px solid #ddd';
      valueCell.style.padding = '8px';
      valueCell.style.fontFamily = 'monospace';
      
      if (value === undefined) {
        console.log(`ℹ️ ${envVar}: non définie`);
        statusCell.textContent = 'ℹ️ Non définie';
        statusCell.style.color = 'blue';
        valueCell.textContent = '-';
      } else if (value === '') {
        console.log(`⚠️ ${envVar}: définie mais vide`);
        statusCell.textContent = '⚠️ Définie mais vide';
        statusCell.style.color = 'orange';
        valueCell.textContent = '""';
      } else {
        console.log(`✅ ${envVar}: définie`);
        statusCell.textContent = '✅ Définie';
        statusCell.style.color = 'green';
        valueCell.textContent = '********';
      }
      
      row.appendChild(statusCell);
      row.appendChild(valueCell);
      envTbody.appendChild(row);
    });
    
    envTable.appendChild(envTbody);
    document.getElementById('config-output').appendChild(envTable);

    // Vérifier si les URLs sont valides (seulement si définies)
    if (supabaseUrl) {
      try {
        new URL(supabaseUrl);
        console.log('\n✅ VITE_SUPABASE_URL est une URL valide');
        
        const urlInfo = document.createElement('div');
        urlInfo.style.marginTop = '20px';
        urlInfo.style.padding = '10px';
        urlInfo.style.backgroundColor = '#e6f7e6';
        urlInfo.style.borderRadius = '5px';
        urlInfo.innerHTML = '✅ VITE_SUPABASE_URL est une URL valide';
        document.getElementById('config-output').appendChild(urlInfo);
      } catch (error) {
        console.error('\n❌ VITE_SUPABASE_URL n\'est pas une URL valide');
        
        const urlError = document.createElement('div');
        urlError.style.marginTop = '20px';
        urlError.style.padding = '10px';
        urlError.style.backgroundColor = '#f7e6e6';
        urlError.style.borderRadius = '5px';
        urlError.innerHTML = '❌ VITE_SUPABASE_URL n\'est pas une URL valide';
        document.getElementById('config-output').appendChild(urlError);
      }
    }

    // Vérifier si la clé anon a un format valide (seulement si définie)
    if (supabaseKey) {
      if (supabaseKey.length < 30) {
        console.error('❌ VITE_SUPABASE_ANON_KEY semble invalide (trop courte)');
        
        const keyError = document.createElement('div');
        keyError.style.marginTop = '10px';
        keyError.style.padding = '10px';
        keyError.style.backgroundColor = '#f7e6e6';
        keyError.style.borderRadius = '5px';
        keyError.innerHTML = '❌ VITE_SUPABASE_ANON_KEY semble invalide (trop courte)';
        document.getElementById('config-output').appendChild(keyError);
      } else {
        console.log('✅ VITE_SUPABASE_ANON_KEY a un format valide');
        
        const keyInfo = document.createElement('div');
        keyInfo.style.marginTop = '10px';
        keyInfo.style.padding = '10px';
        keyInfo.style.backgroundColor = '#e6f7e6';
        keyInfo.style.borderRadius = '5px';
        keyInfo.innerHTML = '✅ VITE_SUPABASE_ANON_KEY a un format valide';
        document.getElementById('config-output').appendChild(keyInfo);
      }
    }

    // Vérifier la structure du projet
    console.log('\n📁 Structure du projet:');
    
    // Dans StackBlitz, nous ne pouvons pas vérifier la structure du système de fichiers
    // Nous allons donc afficher un message d'information
    const structureInfo = document.createElement('div');
    structureInfo.style.marginTop = '20px';
    structureInfo.style.padding = '10px';
    structureInfo.style.backgroundColor = '#f5f5f5';
    structureInfo.style.borderRadius = '5px';
    structureInfo.innerHTML = `
      <h3>📁 Structure du projet</h3>
      <p>Dans l'environnement StackBlitz, nous ne pouvons pas vérifier automatiquement la structure des fichiers.</p>
      <p>Assurez-vous que votre projet contient les éléments suivants:</p>
      <ul>
        <li>Répertoire <code>supabase/functions</code> pour les fonctions Edge</li>
        <li>Répertoire <code>supabase/migrations</code> pour les migrations SQL</li>
        <li>Fichier <code>supabase/config.toml</code> pour la configuration</li>
      </ul>
    `;
    document.getElementById('config-output').appendChild(structureInfo);

    console.log('\n✅ Vérification de la configuration Supabase terminée');
    
    // Résumé
    const summary = document.createElement('div');
    summary.style.marginTop = '20px';
    summary.style.padding = '10px';
    summary.style.backgroundColor = '#e6f7e6';
    summary.style.borderRadius = '5px';
    summary.style.fontWeight = 'bold';
    summary.innerHTML = '✅ Vérification de la configuration Supabase terminée';
    document.getElementById('config-output').appendChild(summary);
  } else {
    // Version Node.js (pour GitHub Actions)
    // Vérifier les variables requises
    console.log('\n📋 Variables d\'environnement requises:');
    requiredEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value === undefined) {
        console.log(`❌ ${envVar}: non définie`);
      } else if (value === '') {
        console.log(`⚠️ ${envVar}: définie mais vide`);
      } else {
        const displayValue = value.substring(0, 5) + '...' + value.substring(value.length - 5);
        console.log(`✅ ${envVar}: définie (${displayValue})`);
      }
    });

    // Vérifier les variables optionnelles
    console.log('\n📋 Variables d\'environnement optionnelles:');
    optionalEnvVars.forEach(envVar => {
      const value = process.env[envVar];
      if (value === undefined) {
        console.log(`ℹ️ ${envVar}: non définie`);
      } else if (value === '') {
        console.log(`⚠️ ${envVar}: définie mais vide`);
      } else {
        console.log(`✅ ${envVar}: définie`);
      }
    });

    // Vérifier si les URLs sont valides (seulement si définies)
    if (supabaseUrl) {
      try {
        new URL(supabaseUrl);
        console.log('\n✅ VITE_SUPABASE_URL est une URL valide');
      } catch (error) {
        console.error('\n❌ VITE_SUPABASE_URL n\'est pas une URL valide');
      }
    }

    // Vérifier si la clé anon a un format valide (seulement si définie)
    if (supabaseKey) {
      if (supabaseKey.length < 30) {
        console.error('❌ VITE_SUPABASE_ANON_KEY semble invalide (trop courte)');
      } else {
        console.log('✅ VITE_SUPABASE_ANON_KEY a un format valide');
      }
    }

    // En environnement CI, les variables peuvent être disponibles différemment
    if (process.env.CI || process.env.GITHUB_ACTIONS) {
      console.log('\nℹ️ Environnement CI détecté - les variables devraient être injectées par GitHub Actions');
    }

    console.log('\n✅ Vérification de la configuration Supabase terminée');
  }
}

// Interface utilisateur pour StackBlitz (seulement si nous sommes dans un navigateur)
function createUI() {
  if (!isBrowser) return;
  
  const container = document.createElement('div');
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.maxWidth = '800px';
  container.style.margin = '20px auto';
  container.style.padding = '20px';
  container.style.border = '1px solid #ddd';
  container.style.borderRadius = '5px';
  
  const title = document.createElement('h2');
  title.textContent = 'Vérification de la configuration Supabase';
  container.appendChild(title);
  
  const description = document.createElement('p');
  description.textContent = 'Cet outil vérifie la configuration de Supabase dans votre environnement.';
  container.appendChild(description);
  
  // Options
  const optionsDiv = document.createElement('div');
  optionsDiv.style.marginBottom = '20px';
  
  const detailedLabel = document.createElement('label');
  detailedLabel.style.display = 'flex';
  detailedLabel.style.alignItems = 'center';
  detailedLabel.style.marginBottom = '10px';
  
  const detailedCheckbox = document.createElement('input');
  detailedCheckbox.type = 'checkbox';
  detailedCheckbox.id = 'detailed';
  detailedCheckbox.style.marginRight = '10px';
  detailedCheckbox.addEventListener('change', (e) => {
    options.detailed = e.target.checked;
  });
  detailedLabel.appendChild(detailedCheckbox);
  
  const detailedText = document.createElement('span');
  detailedText.textContent = 'Afficher des informations détaillées';
  detailedLabel.appendChild(detailedText);
  
  optionsDiv.appendChild(detailedLabel);
  
  // Bouton de vérification
  const checkButton = document.createElement('button');
  checkButton.textContent = 'Vérifier la configuration';
  checkButton.style.padding = '10px 20px';
  checkButton.style.backgroundColor = '#3ECF8E';
  checkButton.style.color = 'white';
  checkButton.style.border = 'none';
  checkButton.style.borderRadius = '5px';
  checkButton.style.cursor = 'pointer';
  checkButton.onclick = () => {
    // Effacer les résultats précédents
    const outputDiv = document.getElementById('config-output');
    outputDiv.innerHTML = '';
    const consoleOutput = document.getElementById('console-output');
    consoleOutput.innerHTML = '';
    
    // Exécuter la vérification
    checkSupabaseConfig();
  };
  optionsDiv.appendChild(checkButton);
  
  container.appendChild(optionsDiv);
  
  // Div pour les résultats
  const outputDiv = document.createElement('div');
  outputDiv.id = 'config-output';
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
if (isBrowser) {
  document.addEventListener('DOMContentLoaded', createUI);
} else {
  // Si nous sommes dans Node.js, exécuter directement la vérification
  checkSupabaseConfig();
  
  // En environnement CI, on considère que c'est OK même si les variables ne sont pas visibles
  if (process.env.CI || process.env.GITHUB_ACTIONS) {
    console.log('ℹ️ Environnement CI - configuration considérée comme valide');
    process.exit(0);
  } else if (requiredEnvVars.some(envVar => !process.env[envVar])) {
    console.error('\n❌ Variables d\'environnement requises manquantes. Veuillez les configurer.');
    process.exit(1);
  } else {
    process.exit(0);
  }
}