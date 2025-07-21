# Créer un utilisateur test manuellement

## 1. Dans Supabase Dashboard

### Étape 1 : Créer l'utilisateur auth
**Authentication** → **Users** → **Add user** :
- Email : `test-nouveau@nowme.fr`
- Password : `motdepasse123`
- Email confirm : ✅ (coché)

### Étape 2 : Créer le profil utilisateur
**Table Editor** → **user_profiles** → **Insert row** :
- user_id : [copier l'ID de l'utilisateur créé à l'étape 1]
- email : `test-nouveau@nowme.fr`
- first_name : `Sophie`
- last_name : `Test`
- phone : `+33612345678`
- subscription_status : `active`
- subscription_type : `premium`
- created_at : [laisser auto]
- updated_at : [laisser auto]

## 2. Se connecter

Aller sur `/auth/signin` :
- Email : `test-nouveau@nowme.fr`
- Password : `motdepasse123`

## 3. Tester les fonctionnalités

- `/account` → Voir le profil
- `/club/events` → Voir les événements
- `/club/masterclasses` → Accès premium
- `/club/wellness` → Consultations disponibles

## 4. Types d'abonnement

### Discovery (12,99€)
```sql
subscription_type = 'discovery'
```
- Accès limité aux événements découverte
- Pas d'accès aux masterclasses/consultations

### Premium (39,99€)
```sql
subscription_type = 'premium'
```
- Accès complet à toutes les fonctionnalités
- Masterclasses, consultations, événements premium