# 🚀 PixelRise - Plateforme de Génération de Contenu Automatisée

PixelRise est une plateforme SaaS complète qui automatise la création de contenu pour blogs et réseaux sociaux grâce à l'intelligence artificielle.

## ⚡ Démarrage Rapide

```bash
# Cloner le projet
git clone <repository-url>
cd Pixel-Rise

# Backend (Laravel)
cd laravel-backend
composer install

# Frontend (React)
cd ../react-frontend
npm install
npm run dev
```

## 📚 Documentation Complète

**📖 Toute la documentation est disponible dans le dossier [`docs/`](./docs/)**

### 📋 Documents Principaux
- **[Guide de Démarrage](./docs/README-QUICK-START.md)** - Démarrage express
- **[Système Automatique](./docs/SYSTEME_AUTOMATIQUE.md)** - **⭐ Documentation principale**

## 🎯 Fonctionnalités

- 🤖 **Génération automatique** de contenu IA (blog + social media)
- 🛡️ **Post Guardian** - Surveillance intelligente et rattrapage automatique
- 📅 **Génération hebdomadaire** automatique (7 posts/utilisateur)
- 🔄 **Correction automatique** des doublons et erreurs
- 📊 **Rapports automatiques** et monitoring

## 🏗️ Architecture

```
Pixel-Rise/
├── 📁 react-frontend/          # Interface utilisateur (React + Vite)
├── 📁 laravel-backend/         # API et logique métier (Laravel)
├── 📁 docs/                    # 📚 Documentation complète
└── 📄 README.md               # Ce fichier
```

## 🚀 Technologies

- **Frontend:** React 18, TypeScript, Vite, TailwindCSS
- **Backend:** Laravel 10, PHP 8.2, MySQL 8.0
- **IA:** OpenAI GPT, Pexels API
- **Authentification:** Laravel Sanctum

## 🛡️ Système Automatique

Le système fonctionne **100% en autonomie** avec :

- **Post Guardian** : Surveille et génère automatiquement les posts manqués
- **Génération hebdomadaire** : Crée 7 posts par utilisateur chaque lundi
- **Correction automatique** : Répare les doublons et erreurs de status

**➡️ [Voir la documentation complète du système automatique](./docs/SYSTEME_AUTOMATIQUE.md)**

## 📞 Support

Pour toute question ou problème :
1. Consultez la [documentation](./docs/)
2. Vérifiez les [logs du système](./docs/SYSTEME_AUTOMATIQUE.md#-support-et-maintenance)
3. Utilisez les [commandes de diagnostic](./docs/README.md#-commandes-utiles)

---

*Plateforme développée pour automatiser complètement la création de contenu marketing*
