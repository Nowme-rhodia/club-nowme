// migrate.js - Version StackBlitz (corrigé)
// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || window.env?.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || window.env?.SUPABASE_SERVICE_ROLE_KEY;
const dbPassword = process.env.DB_PASSWORD || window.env?.DB_PASSWORD;

// Options par défaut
let options = {
  direction: 'up',
  dryRun: false,
  verbose: false
};

const projectId = 'dqfyuhwrjozoxadkccdj';

async function runMigrations() {
  try {
    console.log(`🚀 Démarrage des migrations pour le projet ${projectId}`);
    console.log('═'.repeat(50));
    
    // Vérifier les variables d'environnement nécessaires
    if (!dbPassword) {
      console.error('❌ Variable DB_PASSWORD non trouvée');
      
      const errorDiv = document.createElement('div');
      errorDiv.style.padding = '10px';
      errorDiv.style.backgroundColor = '#f7e6e6';
      errorDiv.style.borderRadius = '5px';
      errorDiv.style.marginTop = '10px';
      errorDiv.innerHTML = `
        ❌ Variable DB_PASSWORD non trouvée<br>
        Cette variable est nécessaire pour se connecter à la base de données.
      `;
      document.getElementById('migrations-output').appendChild(errorDiv);
      return;
    }
    
    // Dans StackBlitz, nous ne pouvons pas exécuter directement la CLI Supabase
    // Nous allons donc afficher les commandes à exécuter manuellement
    
    // Construire la commande de migration
    const dbUrl = `postgresql://postgres:${dbPassword}@db.${projectId}.supabase.co:5432/postgres`;
    
    let command = `supabase db push --db-url "${dbUrl}"`;
    
    if (options.direction === 'down') {
      command += ' --dry-run'; // La CLI ne supporte pas nativement le rollback, donc on simule
      console.warn('⚠️ Le rollback n\'est pas directement supporté. Simulation uniquement.');
    }
    
    if (options.dryRun) {
      command += ' --dry-run';
      console.log('🔍 Mode simulation activé (dry-run)');
    }
    
    console.log('\n🔧 Commande à exécuter:');
    // Masquer le mot de passe dans l'affichage
    console.log(command.replace(dbPassword, '********'));
    
    // Créer un bloc de commande pour l'utilisateur
    const commandBlock = document.createElement('div');
    commandBlock.style.marginTop = '20px';
    commandBlock.style.padding = '10px';
    commandBlock.style.backgroundColor = '#f5f5f5';
    commandBlock.style.borderRadius = '5px';
    commandBlock.style.fontFamily = 'monospace';
    commandBlock.style.whiteSpace = 'pre-wrap';
    commandBlock.style.overflowX = 'auto';
    commandBlock.textContent = command.replace(dbPassword, '********');
    
    const commandTitle = document.createElement('h3');
    commandTitle.textContent = '🔧 Commande à exécuter manuellement:';
    document.getElementById('migrations-output').appendChild(commandTitle);
    document.getElementById('migrations-output').appendChild(commandBlock);
    
    // Instructions pour l'utilisateur
    const instructions = document.createElement('div');
    instructions.style.marginTop = '20px';
    instructions.style.padding = '10px';
    instructions.style.backgroundColor = '#fff3cd';
    instructions.style.borderRadius = '5px';
    instructions.innerHTML = `
      <h3>📝 Instructions:</h3>
      <ol>
        <li>Installez la CLI Supabase sur votre machine locale: <code>npm install -g supabase</code></li>
        <li>Créez un répertoire <code>supabase/migrations</code> contenant vos fichiers SQL de migration</li>
        <li>Exécutez la commande ci-dessus en remplaçant <code>********</code> par votre mot de passe DB</li>
      </ol>
      <p><strong>Note:</strong> Dans StackBlitz, vous ne pouvez pas exécuter directement la CLI Supabase. Ces instructions sont pour une exécution sur votre machine locale.</p>
    `;
    document.getElementById('migrations-output').appendChild(instructions);
    
    // Simuler le résultat
    if (options.dryRun) {
      console.log('\n⏭️ Simulation terminée (aucune modification appliquée)');
      
      const simulationResult = document.createElement('div');
      simulationResult.style.marginTop = '20px';
      simulationResult.style.padding = '10px';
      simulationResult.style.backgroundColor = '#e6f7e6';
      simulationResult.style.borderRadius = '5px';
      simulationResult.innerHTML = '⏭️ Simulation terminée (aucune modification ne serait appliquée)';
      document.getElementById('migrations-output').appendChild(simulationResult);
    }
    
  } catch (error) {
    console.error('\n❌ Erreur lors des migrations:', error.message);
    
    const errorDiv = document.createElement('div');
    errorDiv.style.padding = '10px';
    errorDiv.style.backgroundColor = '#f7e6e6';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.marginTop = '10px';
    errorDiv.innerHTML = `❌ Erreur lors des migrations: ${error.message}`;
    document.getElementById('migrations-output').appendChild(errorDiv);
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
  title.textContent = 'Migrations Supabase';
  container.appendChild(title);
  
  const description = document.createElement('p');
  description.textContent = 'Cet outil vous aide à gérer les migrations de votre base de données Supabase.';
  container.appendChild(description);
  
  // Options
  const optionsDiv = document.createElement('div');
  optionsDiv.style.marginBottom = '20px';
  
  // Direction
  const directionLabel = document.createElement('label');
  directionLabel.textContent = 'Direction: ';
  directionLabel.style.marginRight = '10px';
  optionsDiv.appendChild(directionLabel);
  
  const directionSelect = document.createElement('select');
  directionSelect.style.marginRight = '20px';
  directionSelect.style.padding = '5px';
  
  const upOption = document.createElement('option');
  upOption.value = 'up';
  upOption.textContent = 'Up (appliquer)';
  directionSelect.appendChild(upOption);
  
  const downOption = document.createElement('option');
  downOption.value = 'down';
  downOption.textContent = 'Down (simuler rollback)';
  directionSelect.appendChild(downOption);
  
  directionSelect.addEventListener('change', (e) => {
    options.direction = e.target.value;
  });
  optionsDiv.appendChild(directionSelect);
  
  // Dry Run
  const dryRunLabel = document.createElement('label');
  dryRunLabel.style.display = 'flex';
  dryRunLabel.style.alignItems = 'center';
  dryRunLabel.style.marginBottom = '10px';
  dryRunLabel.style.marginTop = '10px';
  
  const dryRunCheckbox = document.createElement('input');
  dryRunCheckbox.type = 'checkbox';
  dryRunCheckbox.id = 'dry-run';
  dryRunCheckbox.style.marginRight = '10px';
  dryRunCheckbox.addEventListener('change', (e) => {
    options.dryRun = e.target.checked;
  });
  dryRunLabel.appendChild(dryRunCheckbox);
  
  const dryRunText = document.createElement('span');
  dryRunText.textContent = 'Simuler sans exécuter (dry-run)';
  dryRunLabel.appendChild(dryRunText);
  
  optionsDiv.appendChild(dryRunLabel);
  
  // Verbose
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
  
  // Mot de passe DB
  const dbPasswordLabel = document.createElement('label');
  dbPasswordLabel.textContent = 'Mot de passe DB: ';
  dbPasswordLabel.style.display = 'block';
  dbPasswordLabel.style.marginTop = '10px';
  dbPasswordLabel.style.marginBottom = '5px';
  optionsDiv.appendChild(dbPasswordLabel);
  
  const dbPasswordInput = document.createElement('input');
  dbPasswordInput.type = 'password';
  dbPasswordInput.placeholder = 'Mot de passe de la base de données';
  dbPasswordInput.style.width = '100%';
  dbPasswordInput.style.padding = '5px';
  dbPasswordInput.style.marginBottom = '10px';
  dbPasswordInput.addEventListener('input', (e) => {
    window.env = window.env || {};
    window.env.DB_PASSWORD = e.target.value;
  });
  optionsDiv.appendChild(dbPasswordInput);
  
  // Bouton d'exécution
  const runButton = document.createElement('button');
  runButton.textContent = 'Générer la commande de migration';
  runButton.style.padding = '10px 20px';
  runButton.style.backgroundColor = '#3ECF8E';
  runButton.style.color = 'white';
  runButton.style.border = 'none';
  runButton.style.borderRadius = '5px';
  runButton.style.cursor = 'pointer';
  runButton.onclick = () => {
    // Effacer les résultats précédents
    const outputDiv = document.getElementById('migrations-output');
    outputDiv.innerHTML = '';
    const consoleOutput = document.getElementById('console-output');
    consoleOutput.innerHTML = '';
    
    // Exécuter les migrations
    runMigrations();
  };
  optionsDiv.appendChild(runButton);
  
  container.appendChild(optionsDiv);
  
  // Div pour les résultats
  const outputDiv = document.createElement('div');
  outputDiv.id = 'migrations-output';
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