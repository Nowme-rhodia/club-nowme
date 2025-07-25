-- Migration: test_github_action
-- Created at: 2025-07-25T09:13:06.598Z

-- Migration de test pour vérifier le déploiement GitHub Actions

-- Création d'une table temporaire pour test
CREATE TABLE IF NOT EXISTS test_github_deploy (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  label TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

