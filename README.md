# 🌐 Nowme – Supabase Functions Deployment (Stackblitz + GitHub)

Ce projet est configuré pour fonctionner **sans CLI local**, avec :

✅ Développement via Stackblitz  
✅ Déploiement automatique via GitHub Actions  
✅ Supabase utilisé pour les Edge Functions, les bases et les migrations  

---

## 🚀 Déploiement automatique

À chaque `git push` sur la branche `main` ou `staging`, le workflow `.github/workflows/supabase.yml` :

1. ✅ Vérifie la configuration Supabase (`check-supabase-config`)
2. ✅ Applique les migrations (`apply-migrations`)
3. ✅ Déploie les fonctions dans Supabase (`deploy-edge-functions`)

Aucune action manuelle nécessaire après push 🎉

---

## 📁 Structure du projet attendue


