# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/210f803b-4ff4-4acc-9ea2-8c819df5004f

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/210f803b-4ff4-4acc-9ea2-8c819df5004f) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/210f803b-4ff4-4acc-9ea2-8c819df5004f) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)





# NETTOYAGE DU SYSTÈME PAYMENT - SUPPRESSION DES FICHIERS CONFLICTUELS
# ✅ À exécuter depuis react-frontend/

# 🗑️ SUPPRESSION DES FICHIERS DE CONFIGURATION CONFLICTUELS
echo "🧹 Nettoyage des fichiers conflictuels du système payment..."

# Fichiers de configuration Node.js/Vite
rm -f src/components/payments/package.json
rm -f src/components/payments/package-lock.json
rm -f src/components/payments/tsconfig.json
rm -f src/components/payments/tsconfig.app.json
rm -f src/components/payments/tsconfig.node.json
rm -f src/components/payments/vite.config.ts
rm -f src/components/payments/eslint.config.js

# Fichiers de configuration Tailwind/PostCSS
rm -f src/components/payments/tailwind.config.ts
rm -f src/components/payments/postcss.config.js
rm -f src/components/payments/components.json

# Fichiers d'application autonome
rm -f src/components/payments/index.html
rm -f src/components/payments/src/main.tsx
rm -f src/components/payments/src/vite-env.d.ts

# Fichiers de styles (remplacés par payment-isolated.css)
rm -f src/components/payments/src/App.css
rm -f src/components/payments/src/index.css

echo "✅ Nettoyage terminé ! Fichiers conflictuels supprimés."

# 📁 STRUCTURE FINALE PRÉVUE :
echo "📁 Structure finale du système payment :"
echo "src/components/payments/"
echo "├── PaymentWrapper.tsx          # ✅ Wrapper isolé"
echo "├── payment-isolated.css        # ✅ Styles isolés"
echo "└── src/"
echo "    ├── App.tsx                 # ✅ Adapté avec PaymentWrapper"
echo "    ├── hooks/                  # ✅ Logique métier préservée"
echo "    ├── lib/                    # ✅ Utilitaires préservés"
echo "    ├── components/             # ✅ Composants UI préservés"
echo "    ├── pages/                  # ✅ Pages préservées"
echo "    └── types/                  # ✅ Types préservés"

echo ""
echo "🎯 Prêt pour l'intégration modulaire dans le projet principal !"




✅ PaymentWrapper.tsx                  # Wrapper d'isolation
✅ payment-isolated.css               # Styles isolés complets
✅ src/App.tsx                        # Application adaptée
✅ src/hooks/                         # Logique métier PayPal/Abonnements
✅ src/lib/                          # Utilitaires spécialisés
✅ src/components/                    # Interface utilisateur complète
✅ src/pages/                        # Pages de paiement
✅ src/types/                        # Types TypeScript payment