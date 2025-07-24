#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { program } from 'commander';
import chalk from 'chalk';

program
  .version('1.0.0')
  .description('Recherche des fonctions obsolètes dans les migrations Supabase')
  .option('-p, --pattern <regex>', 'Motif de recherche personnalisé', 'role\\(\\)')
  .option('-f, --fix', 'Générer des suggestions de correction')
  .parse(process.argv);

const options = program.opts();
const searchPattern = new RegExp(options.pattern, 'g');

async function findRoleFunction() {
  console.log(chalk.blue('🔍 Recherche de la fonction role() dans les migrations...'));
  console.log(chalk.blue('='.repeat(60)));

  try {
    const migrationsDir = path.join(process.cwd(), 'supabase/migrations');
    
    // Vérifier si le répertoire existe
    try {
      await fs.access(migrationsDir);
    } catch (error) {
      console.error(chalk.red('❌ Le répertoire des migrations n\'existe pas:', migrationsDir));
      process.exit(1);
    }
    
    const files = await fs.readdir(migrationsDir);
    const sqlFiles = files.filter(f => f.endsWith('.sql')).sort();
    
    if (sqlFiles.length === 0) {
      console.log(chalk.yellow('⚠️ Aucun fichier SQL trouvé dans le répertoire des migrations'));
      process.exit(0);
    }

    let foundOccurrences = false;
    const occurrencesByFile = {};

    // Rechercher dans chaque fichier
    for (const file of sqlFiles) {
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, 'utf8');
      
      // Chercher les occurrences du motif
      const matches = content.match(searchPattern);
      
      if (matches && matches.length > 0) {
        foundOccurrences = true;
        occurrencesByFile[file] = [];
        
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.match(searchPattern)) {
            occurrencesByFile[file].push({
              lineNumber: index + 1,
              content: line.trim(),
              context: extractContext(lines, index)
            });
          }
        });
      }
    }

    // Afficher les résultats
    if (!foundOccurrences) {
      console.log(chalk.green('✅ Aucune occurrence de role() trouvée dans les migrations'));
      process.exit(0);
    }

    console.log(chalk.yellow(`⚠️ Occurrences de role() trouvées dans ${Object.keys(occurrencesByFile).length} fichiers`));
    
    for (const [file, occurrences] of Object.entries(occurrencesByFile)) {
      console.log(chalk.blue(`\n📄 Fichier: ${file}`));
      console.log(chalk.blue('-'.repeat(40)));
      
      occurrences.forEach(occurrence => {
        console.log(chalk.yellow(`Ligne ${occurrence.lineNumber}:`));
        console.log(chalk.red(occurrence.content));
        
        if (occurrence.context) {
          console.log(chalk.gray('\nContexte:'));
          console.log(chalk.gray(occurrence.context));
        }
        
        if (options.fix) {
          const suggestion = suggestFix(occurrence.content);
          if (suggestion) {
            console.log(chalk.green('\nSuggestion de correction:'));
            console.log(chalk.green(suggestion));
          }
        }
        
        console.log(chalk.blue('-'.repeat(40)));
      });
    }

    console.log(chalk.yellow('\n🔧 CORRECTION NÉCESSAIRE:'));
    console.log(chalk.yellow('La fonction role() est obsolète et doit être remplacée par:'));
    console.log(chalk.green('- auth.jwt() ->> \'role\' pour récupérer le rôle depuis le JWT'));
    console.log(chalk.green('- (select auth.uid()) pour récupérer l\'ID utilisateur'));
    console.log(chalk.green('- auth.role() si disponible dans votre version de supabase-auth'));
    console.log(chalk.blue('\n📚 Documentation: https://supabase.com/docs/guides/auth/auth-helpers'));

  } catch (error) {
    console.error(chalk.red('❌ Erreur:'), error.message);
    process.exit(1);
  }
}

// Extraire le contexte autour de la ligne (quelques lignes avant et après)
function extractContext(lines, lineIndex, contextSize = 2) {
  const start = Math.max(0, lineIndex - contextSize);
  const end = Math.min(lines.length - 1, lineIndex + contextSize);
  
  return lines.slice(start, end + 1)
    .map((line, i) => {
      const currentLineIndex = start + i;
      const prefix = currentLineIndex === lineIndex ? '> ' : '  ';
      return `${prefix}${currentLineIndex + 1}: ${line}`;
    })
    .join('\n');
}

// Suggérer une correction basée sur le contenu de la ligne
function suggestFix(line) {
  if (line.includes('role()')) {
    // Cas typiques de remplacement
    if (line.includes('= role()')) {
      return line.replace('= role()', '= (auth.jwt() ->> \'role\')');
    } else if (line.includes('role() =')) {
      return line.replace('role() =', '(auth.jwt() ->> \'role\') =');
    } else if (line.includes('role() IN')) {
      return line.replace('role() IN', '(auth.jwt() ->> \'role\') IN');
    } else {
      // Remplacement générique
      return line.replace('role()', '(auth.jwt() ->> \'role\')');
    }
  }
  return null;
}

findRoleFunction();