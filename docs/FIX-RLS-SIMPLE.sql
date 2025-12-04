-- Fix RLS : Supprimer les politiques complexes et garder seulement les simples

-- ========================================
-- 1. NETTOYER user_profiles
-- ========================================

-- Supprimer TOUTES les politiques existantes
DROP POLICY IF EXISTS "Allow insert for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Service role can read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "User profile access" ON user_profiles; -- ❌ CELLE-CI CAUSE LE PROBLÈME
DROP POLICY IF EXISTS "User profile update" ON user_profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "View own profile" ON user_profiles;
DROP POLICY IF EXISTS "Update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Service role can delete profiles" ON user_profiles;

-- Créer des politiques SIMPLES et RAPIDES

-- SELECT : L'utilisateur peut lire son propre profil
CREATE POLICY "user_profiles_select_own"
ON user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- INSERT : L'utilisateur peut créer son propre profil
CREATE POLICY "user_profiles_insert_own"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- UPDATE : L'utilisateur peut modifier son propre profil
CREATE POLICY "user_profiles_update_own"
ON user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Service role : Accès complet (pour les Edge Functions)
CREATE POLICY "user_profiles_service_all"
ON user_profiles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 2. NETTOYER subscriptions
-- ========================================

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "subscriptions_user_select" ON subscriptions;
DROP POLICY IF EXISTS "subscriptions_admin_all" ON subscriptions; -- ❌ CELLE-CI CAUSE LE PROBLÈME
DROP POLICY IF EXISTS "subscriptions_service_all" ON subscriptions;
DROP POLICY IF EXISTS "subs_user_select" ON subscriptions;
DROP POLICY IF EXISTS "subs_admin_select" ON subscriptions; -- ❌ CELLE-CI CAUSE LE PROBLÈME

-- Créer des politiques SIMPLES

-- SELECT : L'utilisateur peut lire son propre abonnement
CREATE POLICY "subscriptions_select_own"
ON subscriptions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Service role : Accès complet (pour les Edge Functions)
CREATE POLICY "subscriptions_service_all"
ON subscriptions
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ========================================
-- 3. VÉRIFIER
-- ========================================

-- Vérifier les nouvelles politiques
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('user_profiles', 'subscriptions')
ORDER BY tablename, policyname;

-- Tester une requête
SELECT * FROM user_profiles WHERE user_id = auth.uid();
SELECT * FROM subscriptions WHERE user_id = auth.uid();
