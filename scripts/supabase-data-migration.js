import { createClient } from 'npm:@supabase/supabase-js@2.39.3';

/**
 * Edge Function pour gérer les migrations de données entre tables
 * Permet de copier, transformer et déplacer des données
 */
Deno.serve(async (req) => {
  try {
    // Vérifier si la méthode est POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier l'authentification
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Non autorisé' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Initialiser le client Supabase avec la clé de service
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Récupérer les paramètres de la requête
    const params = await req.json();
    const { 
      operation, 
      sourceTable, 
      targetTable,
      sourceColumns = '*',
      targetColumns,
      mappings = {},
      filters = {},
      batchSize = 100,
      dryRun = false,
      transformFunction
    } = params;

    // Vérifier les paramètres obligatoires
    if (!operation || !sourceTable) {
      return new Response(JSON.stringify({ 
        error: 'Paramètres manquants', 
        details: 'Les paramètres operation et sourceTable sont requis' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Exécuter l'opération demandée
    let result;
    switch (operation) {
      case 'copy':
        if (!targetTable) {
          return new Response(JSON.stringify({ 
            error: 'Paramètre manquant', 
            details: 'Le paramètre targetTable est requis pour l\'opération copy' 
          }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        result = await copyData(
          supabase, 
          sourceTable, 
          targetTable, 
          sourceColumns, 
          targetColumns, 
          mappings, 
          filters, 
          batchSize, 
          dryRun,
          transformFunction
        );
        break;
        
      case 'transform':
        result = await transformData(
          supabase, 
          sourceTable, 
          filters, 
          mappings, 
          batchSize, 
          dryRun,
          transformFunction
        );
        break;
        
      case 'delete':
        result = await deleteData(
          supabase, 
          sourceTable, 
          filters, 
          batchSize, 
          dryRun
        );
        break;
        
      default:
        return new Response(JSON.stringify({ 
          error: 'Opération non reconnue', 
          details: 'Les opérations supportées sont: copy, transform, delete' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Erreur:', error);
    
    return new Response(JSON.stringify({ 
      error: 'Erreur interne du serveur', 
      message: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

/**
 * Copie des données d'une table à une autre avec transformation optionnelle
 */
async function copyData(
  supabase, 
  sourceTable, 
  targetTable, 
  sourceColumns = '*', 
  targetColumns, 
  mappings = {}, 
  filters = {}, 
  batchSize = 100, 
  dryRun = false,
  transformFunctionStr
) {
  // Récupérer les données de la source avec filtres
  let query = supabase.from(sourceTable).select(sourceColumns);
  
  // Appliquer les filtres
  Object.entries(filters).forEach(([column, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Gérer les opérateurs spéciaux comme gt, lt, etc.
      Object.entries(value).forEach(([operator, operatorValue]) => {
        switch(operator) {
          case 'gt': query = query.gt(column, operatorValue); break;
          case 'gte': query = query.gte(column, operatorValue); break;
          case 'lt': query = query.lt(column, operatorValue); break;
          case 'lte': query = query.lte(column, operatorValue); break;
          case 'neq': query = query.neq(column, operatorValue); break;
          case 'in': query = query.in(column, operatorValue); break;
          case 'contains': query = query.contains(column, operatorValue); break;
          case 'ilike': query = query.ilike(column, operatorValue); break;
          // Ajouter d'autres opérateurs au besoin
        }
      });
    } else {
      // Filtre d'égalité simple
      query = query.eq(column, value);
    }
  });
  
  const { data: sourceData, error: sourceError } = await query;
  
  if (sourceError) {
    return { 
      success: false, 
      error: sourceError.message,
      operation: 'copy',
      source: sourceTable,
      target: targetTable
    };
  }
  
  if (sourceData.length === 0) {
    return { 
      success: true, 
      message: 'Aucune donnée à copier',
      operation: 'copy',
      source: sourceTable,
      target: targetTable,
      count: 0
    };
  }
  
  // Transformer les données si nécessaire
  let transformedData = sourceData;
  
  // Appliquer les mappings de colonnes
  if (Object.keys(mappings).length > 0 || transformFunctionStr) {
    transformedData = sourceData.map(row => {
      // Créer un nouvel objet pour la ligne transformée
      const transformedRow = { ...row };
      
      // Appliquer les mappings de colonnes
      Object.entries(mappings).forEach(([targetCol, sourceCol]) => {
        if (typeof sourceCol === 'string') {
          // Mapping simple de colonne à colonne
          transformedRow[targetCol] = row[sourceCol];
        } else if (typeof sourceCol === 'object' && sourceCol.formula) {
          // Mapping avec formule simple (à évaluer avec précaution)
          try {
            // Créer une fonction qui évalue la formule avec la ligne comme contexte
            const formula = new Function('row', `return ${sourceCol.formula}`);
            transformedRow[targetCol] = formula(row);
          } catch (error) {
            console.error(`Erreur dans la formule pour ${targetCol}:`, error);
            transformedRow[targetCol] = null;
          }
        }
      });
      
      // Appliquer la fonction de transformation personnalisée si fournie
      if (transformFunctionStr) {
        try {
          const transformFunction = new Function('row', transformFunctionStr);
          return transformFunction(transformedRow) || transformedRow;
        } catch (error) {
          console.error('Erreur dans la fonction de transformation:', error);
          return transformedRow;
        }
      }
      
      return transformedRow;
    });
  }
  
  // En mode dry run, retourner les données qui seraient insérées
  if (dryRun) {
    return {
      success: true,
      operation: 'copy (dry run)',
      source: sourceTable,
      target: targetTable,
      count: transformedData.length,
      sample: transformedData.slice(0, 5) // Retourner un échantillon des données
    };
  }
  
  // Insérer les données par lots
  const results = {
    success: true,
    operation: 'copy',
    source: sourceTable,
    target: targetTable,
    totalCount: transformedData.length,
    insertedCount: 0,
    errors: []
  };
  
  // Traiter par lots pour éviter les limitations
  for (let i = 0; i < transformedData.length; i += batchSize) {
    const batch = transformedData.slice(i, i + batchSize);
    
    // Insérer le lot dans la table cible
    const { error: insertError, count } = await supabase
      .from(targetTable)
      .insert(batch)
      .select('count');
    
    if (insertError) {
      results.errors.push({
        batch: i / batchSize + 1,
        error: insertError.message
      });
    } else {
      results.insertedCount += count || batch.length;
    }
  }
  
  results.success = results.errors.length === 0;
  return results;
}

/**
 * Transforme des données dans une table existante
 */
async function transformData(
  supabase, 
  table, 
  filters = {}, 
  updates = {}, 
  batchSize = 100, 
  dryRun = false,
  transformFunctionStr
) {
  // Récupérer les données avec filtres
  let query = supabase.from(table).select('*');
  
  // Appliquer les filtres
  Object.entries(filters).forEach(([column, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Gérer les opérateurs spéciaux
      Object.entries(value).forEach(([operator, operatorValue]) => {
        switch(operator) {
          case 'gt': query = query.gt(column, operatorValue); break;
          case 'gte': query = query.gte(column, operatorValue); break;
          case 'lt': query = query.lt(column, operatorValue); break;
          case 'lte': query = query.lte(column, operatorValue); break;
          case 'neq': query = query.neq(column, operatorValue); break;
          case 'in': query = query.in(column, operatorValue); break;
          case 'contains': query = query.contains(column, operatorValue); break;
          case 'ilike': query = query.ilike(column, operatorValue); break;
        }
      });
    } else {
      // Filtre d'égalité simple
      query = query.eq(column, value);
    }
  });
  
  const { data: rowsToUpdate, error: fetchError } = await query;
  
  if (fetchError) {
    return { 
      success: false, 
      error: fetchError.message,
      operation: 'transform',
      table
    };
  }
  
  if (rowsToUpdate.length === 0) {
    return { 
      success: true, 
      message: 'Aucune donnée à transformer',
      operation: 'transform',
      table,
      count: 0
    };
  }
  
  // Préparer les mises à jour
  const updates_to_apply = [];
  
  for (const row of rowsToUpdate) {
    const updateData = { ...updates };
    
    // Appliquer la fonction de transformation personnalisée si fournie
    if (transformFunctionStr) {
      try {
        const transformFunction = new Function('row', 'updates', transformFunctionStr);
        const customUpdates = transformFunction(row, updates) || {};
        Object.assign(updateData, customUpdates);
      } catch (error) {
        console.error('Erreur dans la fonction de transformation:', error);
      }
    }
    
    updates_to_apply.push({
      id: row.id, // Supposant que la table a une colonne 'id'
      original: row,
      updates: updateData
    });
  }
  
  // En mode dry run, retourner les mises à jour qui seraient appliquées
  if (dryRun) {
    return {
      success: true,
      operation: 'transform (dry run)',
      table,
      count: updates_to_apply.length,
      sample: updates_to_apply.slice(0, 5)
    };
  }
  
  // Appliquer les mises à jour par lots
  const results = {
    success: true,
    operation: 'transform',
    table,
    totalCount: updates_to_apply.length,
    updatedCount: 0,
    errors: []
  };
  
  for (let i = 0; i < updates_to_apply.length; i += batchSize) {
    const batch = updates_to_apply.slice(i, i + batchSize);
    
    // Mettre à jour chaque ligne individuellement pour garantir la précision
    for (const item of batch) {
      const { error: updateError } = await supabase
        .from(table)
        .update(item.updates)
        .eq('id', item.id);
      
      if (updateError) {
        results.errors.push({
          id: item.id,
          error: updateError.message
        });
      } else {
        results.updatedCount++;
      }
    }
  }
  
  results.success = results.errors.length === 0;
  return results;
}

/**
 * Supprime des données d'une table selon des filtres
 */
async function deleteData(
  supabase, 
  table, 
  filters = {}, 
  batchSize = 100, 
  dryRun = false
) {
  // Vérifier si des filtres sont fournis pour éviter une suppression accidentelle de toutes les données
  if (Object.keys(filters).length === 0) {
    return { 
      success: false, 
      error: 'Aucun filtre fourni. Pour protéger vos données, des filtres sont requis pour les opérations de suppression.',
      operation: 'delete',
      table
    };
  }
  
  // Récupérer les IDs des lignes à supprimer
  let query = supabase.from(table).select('id');
  
  // Appliquer les filtres
  Object.entries(filters).forEach(([column, value]) => {
    if (typeof value === 'object' && value !== null) {
      // Gérer les opérateurs spéciaux
      Object.entries(value).forEach(([operator, operatorValue]) => {
        switch(operator) {
          case 'gt': query = query.gt(column, operatorValue); break;
          case 'gte': query = query.gte(column, operatorValue); break;
          case 'lt': query = query.lt(column, operatorValue); break;
          case 'lte': query = query.lte(column, operatorValue); break;
          case 'neq': query = query.neq(column, operatorValue); break;
          case 'in': query = query.in(column, operatorValue); break;
          case 'contains': query = query.contains(column, operatorValue); break;
          case 'ilike': query = query.ilike(column, operatorValue); break;
        }
      });
    } else {
      // Filtre d'égalité simple
      query = query.eq(column, value);
    }
  });
  
  const { data: rowsToDelete, error: fetchError } = await query;
  
  if (fetchError) {
    return { 
      success: false, 
      error: fetchError.message,
      operation: 'delete',
      table
    };
  }
  
  if (rowsToDelete.length === 0) {
    return { 
      success: true, 
      message: 'Aucune donnée à supprimer',
      operation: 'delete',
      table,
      count: 0
    };
  }
  
  // En mode dry run, retourner les IDs qui seraient supprimés
  if (dryRun) {
    return {
      success: true,
      operation: 'delete (dry run)',
      table,
      count: rowsToDelete.length,
      ids: rowsToDelete.map(row => row.id)
    };
  }
  
  // Supprimer par lots
  const results = {
    success: true,
    operation: 'delete',
    table,
    totalCount: rowsToDelete.length,
    deletedCount: 0,
    errors: []
  };
  
  // Extraire les IDs
  const ids = rowsToDelete.map(row => row.id);
  
  for (let i = 0; i < ids.length; i += batchSize) {
    const batchIds = ids.slice(i, i + batchSize);
    
    const { error: deleteError } = await supabase
      .from(table)
      .delete()
      .in('id', batchIds);
    
    if (deleteError) {
      results.errors.push({
        batch: i / batchSize + 1,
        error: deleteError.message
      });
    } else {
      results.deletedCount += batchIds.length;
    }
  }
  
  results.success = results.errors.length === 0;
  return results;
}