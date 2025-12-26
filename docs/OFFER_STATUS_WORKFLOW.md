# Workflow des Statuts d'Offre

## Vue d'ensemble

Ce document décrit le cycle de vie d'une offre dans le système Club NowMe, depuis sa création par un partenaire jusqu'à sa publication sur le site.

## Statuts disponibles

| Statut | Description | Visible publiquement | Actions possibles |
|--------|-------------|---------------------|-------------------|
| `draft` | Offre en cours de création, non finalisée | ❌ Non | Éditer, Marquer comme prête, Supprimer |
| `ready` | Offre finalisée, prête à être soumise | ❌ Non | Éditer, Soumettre pour validation, Supprimer |
| `pending` | Offre soumise, en attente de validation admin | ❌ Non | (Aucune - en attente) |
| `approved` | Offre approuvée et publiée | ✅ Oui | Mettre hors ligne, Éditer |
| `rejected` | Offre refusée par l'admin | ❌ Non | Éditer, Re-soumettre |

## Diagramme de flux

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CYCLE DE VIE D'UNE OFFRE                          │
└─────────────────────────────────────────────────────────────────────────────┘

                              ┌──────────┐
                              │  Créer   │
                              │  offre   │
                              └────┬─────┘
                                   │
                                   ▼
                              ┌──────────┐
                              │  DRAFT   │◄─────────────────────────┐
                              │          │                          │
                              └────┬─────┘                          │
                                   │                                │
                         [Marquer comme prête]                      │
                                   │                                │
                                   ▼                                │
                              ┌──────────┐                          │
                              │  READY   │◄──────────┐              │
                              │          │           │              │
                              └────┬─────┘           │              │
                                   │                 │              │
                    [Soumettre pour validation]      │              │
                                   │                 │              │
                                   ▼                 │              │
                              ┌──────────┐           │              │
                              │ PENDING  │           │              │
                              │          │           │              │
                              └────┬─────┘           │              │
                                   │                 │              │
                    ┌──────────────┴──────────────┐  │              │
                    │                             │  │              │
              [Approuver]                   [Refuser]│              │
                    │                             │  │              │
                    ▼                             ▼  │              │
              ┌──────────┐                  ┌──────────┐            │
              │ APPROVED │                  │ REJECTED │────────────┘
              │          │                  │          │  [Éditer et
              └──────────┘                  └──────────┘   re-soumettre]
                    │
                    │
         [Mettre hors ligne]
                    │
                    ▼
              ┌──────────┐
              │  DRAFT   │
              └──────────┘
```

## Actions par rôle

### Partenaire

| Action | Statut actuel | Nouveau statut |
|--------|---------------|----------------|
| Créer une offre | - | `draft` |
| Éditer une offre | `draft`, `ready`, `rejected` | (inchangé) |
| Marquer comme prête | `draft` | `ready` |
| Soumettre pour validation | `ready` | `pending` |
| Supprimer une offre | `draft`, `ready` | (supprimée) |
| Mettre hors ligne | `approved` | `draft` |

### Admin

| Action | Statut actuel | Nouveau statut |
|--------|---------------|----------------|
| Approuver | `pending` | `approved` |
| Refuser | `pending` | `rejected` |
| Voir toutes les offres | tous | - |

## Règles métier

1. **Création** : Toute nouvelle offre commence en statut `draft`
2. **Validation requise** : Une offre doit passer par `pending` avant d'être `approved`
3. **Édition limitée** : Les offres en `pending` ne peuvent pas être éditées
4. **Suppression** : Seules les offres en `draft` ou `ready` peuvent être supprimées
5. **Re-soumission** : Une offre `rejected` peut être éditée puis re-soumise

## Interface utilisateur

### Vue Partenaire (Mes offres)

- **Brouillons** (`draft`) : Badge gris, boutons "Éditer", "Marquer comme prête", "Supprimer"
- **Prêtes** (`ready`) : Badge bleu, boutons "Éditer", "Soumettre", "Supprimer"
- **En validation** (`pending`) : Badge jaune, aucun bouton d'action
- **Approuvées** (`approved`) : Badge vert, bouton "Mettre hors ligne"
- **Refusées** (`rejected`) : Badge rouge, boutons "Éditer", "Re-soumettre"

### Vue Admin (Offres en attente)

- Liste des offres en statut `pending`
- Boutons "Approuver" et "Refuser" pour chaque offre
- Possibilité d'ajouter un commentaire lors du refus

## Mise à jour de l'enum Supabase

```sql
-- Vérifier les valeurs actuelles de l'enum
SELECT enum_range(NULL::offer_status);

-- Ajouter les valeurs manquantes si nécessaire
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'approved';
ALTER TYPE offer_status ADD VALUE IF NOT EXISTS 'rejected';
```
