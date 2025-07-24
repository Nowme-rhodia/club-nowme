// check-emails.js - Version StackBlitz
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || window.env?.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || window.env?.VITE_SUPABASE_ANON_KEY;

// Options par défaut
let options = {
  limit: 10,
  status: null
};

async function checkEmails() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Variables d\'environnement manquantes:');
      console.error('   - VITE_SUPABASE_URL ou window.env.SUPABASE_URL');
      console.error('   - VITE_SUPABASE_ANON_KEY ou window.env.VITE_SUPABASE_ANON_KEY');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Construire la requête
    let query = supabase
      .from('emails')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(parseInt(options.limit));
      
    // Ajouter le filtre de statut si spécifié
    if (options.status) {
      query = query.eq('status', options.status);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('ℹ️ Aucun email trouvé avec les critères spécifiés');
      return;
    }

    console.log(`\n📧 ${data.length} derniers emails:`);
    console.log('═'.repeat(50));
    
    // Créer un tableau HTML pour afficher les résultats
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.marginTop = '20px';
    
    // En-tête du tableau
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    ['ID', 'Destinataire', 'Sujet', 'Statut', 'Erreur', 'Créé le', 'Envoyé le'].forEach(header => {
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
    data.forEach(email => {
      const row = document.createElement('tr');
      
      // ID
      const idCell = document.createElement('td');
      idCell.textContent = email.id;
      idCell.style.border = '1px solid #ddd';
      idCell.style.padding = '8px';
      row.appendChild(idCell);
      
      // Destinataire
      const toCell = document.createElement('td');
      toCell.textContent = email.to_address;
      toCell.style.border = '1px solid #ddd';
      toCell.style.padding = '8px';
      row.appendChild(toCell);
      
      // Sujet
      const subjectCell = document.createElement('td');
      subjectCell.textContent = email.subject;
      subjectCell.style.border = '1px solid #ddd';
      subjectCell.style.padding = '8px';
      row.appendChild(subjectCell);
      
      // Statut
      const statusCell = document.createElement('td');
      statusCell.textContent = email.status;
      statusCell.style.border = '1px solid #ddd';
      statusCell.style.padding = '8px';
      if (email.status === 'sent') {
        statusCell.style.color = 'green';
      } else if (email.status === 'error') {
        statusCell.style.color = 'red';
      }
      row.appendChild(statusCell);
      
      // Erreur
      const errorCell = document.createElement('td');
      errorCell.textContent = email.error || '';
      errorCell.style.border = '1px solid #ddd';
      errorCell.style.padding = '8px';
      errorCell.style.color = 'red';
      row.appendChild(errorCell);
      
      // Créé le
      const createdCell = document.createElement('td');
      createdCell.textContent = new Date(email.created_at).toLocaleString();
      createdCell.style.border = '1px solid #ddd';
      createdCell.style.padding = '8px';
      row.appendChild(createdCell);
      
      // Envoyé le
      const sentCell = document.createElement('td');
      sentCell.textContent = email.sent_at ? new Date(email.sent_at).toLocaleString() : 'Non envoyé';
      sentCell.style.border = '1px solid #ddd';
      sentCell.style.padding = '8px';
      row.appendChild(sentCell);
      
      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    
    // Ajouter le tableau à la sortie
    document.getElementById('emails-output').appendChild(table);
    
    console.log(`\n✅ Total: ${data.length} email(s)`);
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des emails:', error.message);
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
  title.textContent = 'Vérification des emails envoyés via Supabase';
  container.appendChild(title);
  
  const description = document.createElement('p');
  description.textContent = 'Cet outil vous permet de vérifier les emails envoyés via Supabase.';
  container.appendChild(description);
  
  // Options de filtrage
  const optionsDiv = document.createElement('div');
  optionsDiv.style.marginBottom = '20px';
  
  // Limite
  const limitLabel = document.createElement('label');
  limitLabel.textContent = 'Nombre d\'emails à afficher: ';
  limitLabel.style.marginRight = '10px';
  optionsDiv.appendChild(limitLabel);
  
  const limitInput = document.createElement('input');
  limitInput.type = 'number';
  limitInput.min = '1';
  limitInput.max = '100';
  limitInput.value = options.limit;
  limitInput.style.width = '60px';
  limitInput.style.marginRight = '20px';
  limitInput.addEventListener('change', (e) => {
    options.limit = e.target.value;
  });
  optionsDiv.appendChild(limitInput);
  
  // Statut
  const statusLabel = document.createElement('label');
  statusLabel.textContent = 'Filtrer par statut: ';
  statusLabel.style.marginRight = '10px';
  optionsDiv.appendChild(statusLabel);
  
  const statusSelect = document.createElement('select');
  statusSelect.style.marginRight = '20px';
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Tous';
  statusSelect.appendChild(defaultOption);
  
  ['sent', 'pending', 'error'].forEach(status => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    statusSelect.appendChild(option);
  });
  
  statusSelect.addEventListener('change', (e) => {
    options.status = e.target.value || null;
  });
  optionsDiv.appendChild(statusSelect);
  
  // Bouton de recherche
  const searchButton = document.createElement('button');
  searchButton.textContent = 'Rechercher';
  searchButton.style.padding = '5px 15px';
  searchButton.style.backgroundColor = '#3ECF8E';
  searchButton.style.color = 'white';
  searchButton.style.border = 'none';
  searchButton.style.borderRadius = '5px';
  searchButton.style.cursor = 'pointer';
  searchButton.onclick = () => {
    // Effacer les résultats précédents
    const outputDiv = document.getElementById('emails-output');
    outputDiv.innerHTML = '';
    
    // Exécuter la recherche
    checkEmails();
  };
  optionsDiv.appendChild(searchButton);
  
  container.appendChild(optionsDiv);
  
  // Div pour les résultats
  const outputDiv = document.createElement('div');
  outputDiv.id = 'emails-output';
  container.appendChild(outputDiv);
  
  // Rediriger la console vers notre div
  const consoleOutput = document.createElement('div');
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