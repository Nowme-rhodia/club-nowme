// scripts/db-migrate.js
// Ce fichier sert de pont entre les commandes npm et migrate.js

// Utiliser import dynamique pour ES modules
import('../migrate.js').then(module => {
  console.log('Redirection vers migrate.js...');
  
  // Transmettre tous les arguments de ligne de commande
  if (module.default) {
    module.default();
  }
}).catch(err => {
  console.error('Erreur lors du chargement de migrate.js:', err);
  process.exit(1);
});