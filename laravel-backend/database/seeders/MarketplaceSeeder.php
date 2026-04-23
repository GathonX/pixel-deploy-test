<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\MarketplaceCategory;
use App\Models\MarketplaceProduct;
use App\Models\MarketplaceBadge;
use App\Models\User;

class MarketplaceSeeder extends Seeder
{
    public function run(): void
    {
        // Trouver un admin (via is_admin ou role ou email)
        $admin = User::where('is_admin', true)->first()
            ?? User::where('role', 'admin')->first()
            ?? User::where('email', 'LIKE', '%admin%')->first()
            ?? User::first();

        if (!$admin) {
            $this->command->error('❌ Aucun utilisateur trouvé. Créez d\'abord un utilisateur.');
            return;
        }

        $this->command->info('🏗️  Création des catégories...');

        $laptops = MarketplaceCategory::create([
            'name' => 'Laptops',
            'slug' => 'laptops',
            'description' => 'Ordinateurs portables haute performance',
            'is_active' => true,
            'order' => 1,
        ]);

        $smartphones = MarketplaceCategory::create([
            'name' => 'Smartphones',
            'slug' => 'smartphones',
            'description' => 'Téléphones intelligents dernière génération',
            'is_active' => true,
            'order' => 2,
        ]);

        $accessories = MarketplaceCategory::create([
            'name' => 'Accessoires',
            'slug' => 'accessories',
            'description' => 'Accessoires tech et électroniques',
            'is_active' => true,
            'order' => 3,
        ]);

        $this->command->info('📦 Création des produits...');

        // Produit 1: MacBook Pro
        $macbook = MarketplaceProduct::create([
            'created_by' => $admin->id,
            'name' => 'MacBook Pro 16" M3 Max',
            'slug' => 'macbook-pro-16-m3-max',
            'description' => '**Performances exceptionnelles**

- Puce M3 Max avec CPU 14 cœurs
- GPU 30 cœurs
- 36 Go de RAM unifiée
- SSD 1 To ultrarapide
- Écran Liquid Retina XDR 16 pouces
- Autonomie jusqu\'à 22 heures

Parfait pour les créatifs et professionnels exigeants.',
            'price' => 3499.00,
            'original_price' => 3999.00,
            'category_id' => $laptops->id,
            'stock_quantity' => 15,
            'sku' => 'APPLE-MBP16-M3MAX',
            'images' => [
                'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=800',
                'https://images.unsplash.com/photo-1611186871348-b1ce696e52c9?w=800',
            ],
            'is_active' => true,
        ]);

        MarketplaceBadge::create([
            'product_id' => $macbook->id,
            'badge_type' => 'sale',
            'badge_text' => '-15%',
            'badge_color' => '#ef4444',
            'discount_percentage' => 15,
        ]);

        // Produit 2: iPhone 15 Pro
        $iphone = MarketplaceProduct::create([
            'created_by' => $admin->id,
            'name' => 'iPhone 15 Pro Max 256GB',
            'slug' => 'iphone-15-pro-max-256gb',
            'description' => '**Le smartphone le plus avancé**

- Puce A17 Pro
- Système photo professionnel
- Titane aérospatial
- Écran Super Retina XDR 6,7"
- USB-C
- Action Button personnalisable

Disponible en Titane Naturel, Titane Bleu, Titane Blanc et Titane Noir.',
            'price' => 1299.00,
            'category_id' => $smartphones->id,
            'stock_quantity' => 45,
            'sku' => 'APPLE-IP15PMAX-256',
            'images' => [
                'https://images.unsplash.com/photo-1696446702183-cbd0174e6d88?w=800',
                'https://images.unsplash.com/photo-1695048133020-21c464ba3a65?w=800',
            ],
            'is_active' => true,
        ]);

        MarketplaceBadge::create([
            'product_id' => $iphone->id,
            'badge_type' => 'hot',
            'badge_text' => 'HOT',
            'badge_color' => '#f97316',
        ]);

        // Produit 3: AirPods Pro
        $airpods = MarketplaceProduct::create([
            'created_by' => $admin->id,
            'name' => 'AirPods Pro (2ème génération)',
            'slug' => 'airpods-pro-2',
            'description' => '**Audio immersif et réduction de bruit**

- Réduction active du bruit 2x plus performante
- Audio spatial personnalisé
- Boîtier MagSafe avec haut-parleur
- Résistance à l\'eau et à la sueur (IPX4)
- Jusqu\'à 6h d\'autonomie

Le summum des écouteurs sans fil.',
            'price' => 279.00,
            'original_price' => 299.00,
            'category_id' => $accessories->id,
            'stock_quantity' => 8,
            'sku' => 'APPLE-AIRPODSPRO2',
            'images' => [
                'https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?w=800',
            ],
            'is_active' => true,
        ]);

        MarketplaceBadge::create([
            'product_id' => $airpods->id,
            'badge_type' => 'limited',
            'badge_text' => 'Stock limité',
            'badge_color' => '#8b5cf6',
        ]);

        // Produit 4: Dell XPS 15
        $dell = MarketplaceProduct::create([
            'created_by' => $admin->id,
            'name' => 'Dell XPS 15 9530',
            'slug' => 'dell-xps-15-9530',
            'description' => '**Puissance et élégance**

- Intel Core i7-13700H (13ème gen)
- NVIDIA GeForce RTX 4060 8GB
- 32 Go DDR5
- SSD NVMe 1 To
- Écran OLED 3.5K tactile
- Châssis aluminium CNC

Le laptop parfait pour création et gaming.',
            'price' => 2199.00,
            'category_id' => $laptops->id,
            'stock_quantity' => 0,
            'sku' => 'DELL-XPS15-9530',
            'images' => [
                'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800',
            ],
            'is_active' => true,
        ]);

        // Produit 5: Samsung Galaxy S24 Ultra
        $samsung = MarketplaceProduct::create([
            'created_by' => $admin->id,
            'name' => 'Samsung Galaxy S24 Ultra 512GB',
            'slug' => 'samsung-galaxy-s24-ultra-512gb',
            'description' => '**L\'intelligence mobile redéfinie**

- Snapdragon 8 Gen 3
- Écran Dynamic AMOLED 2X 6,8"
- Quadruple caméra 200MP
- S Pen intégré
- Batterie 5000 mAh
- Galaxy AI

Découvrez le futur de la photographie mobile.',
            'price' => 1399.00,
            'original_price' => 1599.00,
            'category_id' => $smartphones->id,
            'stock_quantity' => 23,
            'sku' => 'SAMSUNG-S24U-512',
            'images' => [
                'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=800',
            ],
            'is_active' => true,
        ]);

        MarketplaceBadge::create([
            'product_id' => $samsung->id,
            'badge_type' => 'new',
            'badge_text' => 'NOUVEAU',
            'badge_color' => '#22c55e',
        ]);

        MarketplaceBadge::create([
            'product_id' => $samsung->id,
            'badge_type' => 'sale',
            'badge_text' => '-13%',
            'badge_color' => '#eab308',
            'discount_percentage' => 13,
        ]);

        $this->command->info('✅ Seeder marketplace terminé!');
        $this->command->info('📊 Catégories créées: 3');
        $this->command->info('📦 Produits créés: 5');
        $this->command->info('🏷️  Badges créés: 5');
    }
}
