#!/bin/bash
# Script pour exécuter les migrations marketplace

cd /var/www/pixel-rise/releases/release_20251225_140234/laravel-backend

# Trouver le binaire PHP
PHP_BIN=$(which php || echo "/usr/local/bin/php")

echo "🔄 Exécution des migrations marketplace..."
echo "📍 Répertoire: $(pwd)"
echo "🐘 PHP: $PHP_BIN"

$PHP_BIN artisan migrate --force --path=database/migrations/2026_01_05_000001_create_marketplace_categories_table.php
$PHP_BIN artisan migrate --force --path=database/migrations/2026_01_05_000002_create_marketplace_products_table.php
$PHP_BIN artisan migrate --force --path=database/migrations/2026_01_05_000003_create_marketplace_badges_table.php
$PHP_BIN artisan migrate --force --path=database/migrations/2026_01_05_000004_create_marketplace_orders_table.php
$PHP_BIN artisan migrate --force --path=database/migrations/2026_01_05_000005_create_marketplace_order_items_table.php
$PHP_BIN artisan migrate --force --path=database/migrations/2026_01_05_000006_create_marketplace_carts_table.php
$PHP_BIN artisan migrate --force --path=database/migrations/2026_01_05_000007_create_marketplace_inventory_logs_table.php

echo "✅ Migrations terminées!"
