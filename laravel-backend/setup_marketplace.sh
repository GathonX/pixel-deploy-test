#!/bin/bash
# Script complet pour configurer le marketplace

echo "🚀 Configuration du Marketplace Pixel Rise"
echo "=========================================="

cd /var/www/pixel-rise/releases/release_20251225_140234/laravel-backend

# Exécuter les migrations
echo ""
echo "📊 Exécution des migrations..."
./run_marketplace_migrations.sh

# Exécuter le seeder
echo ""
echo "🌱 Remplissage des données de test..."
php artisan db:seed --class=MarketplaceSeeder

echo ""
echo "✅ Configuration terminée!"
echo ""
echo "📝 Résumé:"
echo "  - 7 tables créées (marketplace_*)"
echo "  - 3 catégories ajoutées"
echo "  - 5 produits de démonstration"
echo "  - Routes API disponibles sur /api/marketplace"
echo ""
echo "🌐 Accès:"
echo "  - User: https://app.pixel-rise.com/marketplace"
echo "  - Admin: https://app.pixel-rise.com/admin/marketplace/dashboard"
echo ""
