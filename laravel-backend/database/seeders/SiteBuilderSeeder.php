<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SectionType;
use App\Models\SiteTemplate;
use App\Models\TemplatePage;
use App\Models\TemplateSection;
use Illuminate\Support\Facades\DB;

class SiteBuilderSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedSectionTypes();
        $this->seedAllTemplates();
    }

    private function seedSectionTypes(): void
    {
        // Clean up all non-luxios section types
        SectionType::where('id', 'not like', 'luxios%')->delete();

        $sectionTypes = [
            // ===== LUXIOS HOTEL SECTION TYPES =====
            [
                'id' => 'luxios-navbar',
                'name' => 'Navbar Luxios Hotel',
                'schema' => ['brandName' => 'string', 'tagline' => 'string', 'logoUrl' => 'string', 'faviconUrl' => 'string', 'links' => 'string'],
                'default_content' => [
                    'brandName' => 'LUXIOS',
                    'tagline' => 'Resort',
                    'logoUrl' => '/images/logo-icon.png',
                    'faviconUrl' => '/images/logo-icon.png',
                    'links' => '[{"label":"ACCUEIL","href":"/"},{"label":"À PROPOS","href":"/about"},{"label":"SERVICES","href":"/services"},{"label":"CHAMBRES","href":"/rooms"},{"label":"ACTUALITÉS","href":"/news"},{"label":"CONTACT","href":"/contact"}]'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-hero',
                'name' => 'Hero Luxios Hotel',
                'schema' => ['backgroundImage' => 'string', 'brandName' => 'string', 'tagline' => 'string', 'subtitle' => 'string', 'ctaText' => 'string', 'ctaUrl' => 'string'],
                'default_content' => [
                    'backgroundImage' => '/images/hero-bg.jpg',
                    'brandName' => 'LUXIOS',
                    'tagline' => 'Resort',
                    'subtitle' => 'Un monde de sérénité vous attend',
                    'ctaText' => 'Découvrir',
                    'ctaUrl' => '#rooms'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-booking',
                'name' => 'Barre de Réservation Luxios',
                'schema' => ['ctaText' => 'string', 'label1' => 'string', 'opts1' => 'string', 'label2' => 'string', 'opts2' => 'string', 'label3' => 'string', 'opts3' => 'string'],
                'default_content' => [
                    'ctaText' => 'Vérifier la disponibilité',
                    'label1' => 'Adultes',
                    'opts1' => '1 Adulte,2 Adultes,3 Adultes,4 Adultes',
                    'label2' => 'Enfants',
                    'opts2' => '0 Enfant,1 Enfant,2 Enfants',
                    'label3' => 'Type de chambre',
                    'opts3' => 'Suite Vue Mer,Chambre Deluxe,Suite Prestige'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-welcome',
                'name' => 'Accueil / À propos Luxios',
                'schema' => ['subtitle' => 'string', 'title' => 'string', 'description' => 'string', 'managerName' => 'string', 'managerTitle' => 'string', 'phone' => 'string', 'phoneLabel' => 'string'],
                'default_content' => [
                    'subtitle' => 'bienvenue',
                    'title' => 'l\'art de vivre le luxe',
                    'description' => 'Nous sommes le meilleur resort cinq étoiles. Découvrez l\'harmonie parfaite entre luxe et nature dans un cadre époustouflant. Chaque détail a été pensé pour votre confort et votre relaxation absolue.',
                    'managerName' => 'Jefferson Kuroiwa',
                    'managerTitle' => 'Directeur Général',
                    'phone' => '+123 456 789',
                    'phoneLabel' => 'Réservation'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-rooms',
                'name' => 'Chambres & Suites Luxios',
                'schema' => ['subtitle' => 'string', 'title' => 'string', 'ctaText' => 'string', 'ctaUrl' => 'string', 'nightText' => 'string', 'room1Image' => 'string', 'room1Name' => 'string', 'room1Size' => 'string', 'room1Price' => 'string', 'room2Image' => 'string', 'room2Name' => 'string', 'room2Size' => 'string', 'room2Price' => 'string', 'room3Image' => 'string', 'room3Name' => 'string', 'room3Size' => 'string', 'room3Price' => 'string'],
                'default_content' => [
                    'subtitle' => 'luxios resort',
                    'title' => 'Chambres & Suites',
                    'ctaText' => 'Voir tout',
                    'ctaUrl' => '/rooms',
                    'nightText' => '/ nuit',
                    'room1Image' => '/images/deluxe-room.jpg',
                    'room1Name' => 'Chambre Deluxe', 'room1Size' => '39 m².', 'room1Price' => '300 000 Ar',
                    'room2Image' => '/images/oceanview-suite.jpg',
                    'room2Name' => 'Suite Vue Mer', 'room2Size' => '46 m².', 'room2Price' => '520 000 Ar',
                    'room3Image' => '/images/premier-suite.jpg',
                    'room3Name' => 'Suite Prestige', 'room3Size' => '54 m².', 'room3Price' => '750 000 Ar'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-amenities',
                'name' => 'Équipements Luxios',
                'schema' => ['subtitle' => 'string', 'title' => 'string'],
                'default_content' => [
                    'subtitle' => 'nos équipements',
                    'title' => 'Équipements de l\'Hôtel',
                    'amenity1Name' => 'Climatisation', 'amenity1Desc' => 'Chambres climatisées pour votre confort.',
                    'amenity2Name' => 'Petit-déjeuner', 'amenity2Desc' => 'Petit-déjeuner gastronomique inclus chaque matin.',
                    'amenity3Name' => 'Fibre Wifi', 'amenity3Desc' => 'Internet haut débit dans tout le resort.',
                    'amenity4Name' => 'Piscine', 'amenity4Desc' => 'Piscine à débordement avec vue sur l\'océan.',
                    'amenity5Name' => 'Service en chambre', 'amenity5Desc' => 'Service en chambre disponible 24h/24.',
                    'amenity6Name' => 'Parking', 'amenity6Desc' => 'Parking sécurisé avec voiturier.',
                    'amenity7Name' => 'Blanchisserie', 'amenity7Desc' => 'Service de blanchisserie et pressing en 24h.',
                    'amenity8Name' => 'Accès plage', 'amenity8Desc' => 'Plage privée avec transats et parasols.'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-services',
                'name' => 'Services Luxios',
                'schema' => ['subtitle' => 'string', 'title' => 'string', 'exploreText' => 'string', 'service1Image' => 'string', 'service1Category' => 'string', 'service1Name' => 'string', 'service1Desc' => 'string', 'service1Url' => 'string', 'service2Image' => 'string', 'service2Category' => 'string', 'service2Name' => 'string', 'service2Desc' => 'string', 'service2Url' => 'string', 'service3Image' => 'string', 'service3Category' => 'string', 'service3Name' => 'string', 'service3Desc' => 'string', 'service3Url' => 'string'],
                'default_content' => [
                    'subtitle' => 'Gastronomie & Bien-être',
                    'title' => 'Nos Services',
                    'exploreText' => 'Découvrir',
                    'service1Image' => '/images/restaurant.jpg',
                    'service1Category' => 'Gastronomie', 'service1Name' => 'Restaurant',
                    'service1Desc' => 'Savourez une cuisine d\'exception préparée par nos chefs primés avec les meilleurs produits locaux.',
                    'service1Url' => '#',
                    'service2Image' => '/images/spa.jpg',
                    'service2Category' => 'Bien-être', 'service2Name' => 'Spa & Bien-être',
                    'service2Desc' => 'Ressourcez votre corps et votre esprit grâce à nos soins exclusifs et programmes de bien-être personnalisés.',
                    'service2Url' => '#',
                    'service3Image' => '/images/bar.jpg',
                    'service3Category' => 'Boissons', 'service3Name' => 'Bar sur le Toit',
                    'service3Desc' => 'Dégustez des cocktails artisanaux avec une vue panoramique exceptionnelle depuis notre terrasse en rooftop.',
                    'service3Url' => '#',
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-news',
                'name' => 'Actualités Luxios',
                'schema' => ['subtitle' => 'string', 'title' => 'string', 'ctaText' => 'string', 'ctaUrl' => 'string', 'readMore' => 'string', 'article1Image' => 'string', 'article1Title' => 'string', 'article1Category' => 'string', 'article1Desc' => 'string', 'article2Image' => 'string', 'article2Title' => 'string', 'article2Category' => 'string', 'article2Desc' => 'string'],
                'default_content' => [
                    'subtitle' => 'notre blog',
                    'title' => 'Actualités & Articles',
                    'ctaText' => 'Voir tout',
                    'ctaUrl' => '/news',
                    'readMore' => 'Lire la suite',
                    'article1Image' => '/images/blog1.jpg',
                    'article1Title' => 'Panoramas Époustouflants', 'article1Category' => 'Découverte',
                    'article1Desc' => 'Découvrez les vues les plus spectaculaires depuis les points d\'observation privés de notre resort.',
                    'article2Image' => '/images/blog2.jpg',
                    'article2Title' => 'Jardins Zen', 'article2Category' => 'Détente',
                    'article2Desc' => 'Explorez nos jardins zen, un sanctuaire de paix et de contemplation au cœur du resort.'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-page-hero',
                'name' => 'Bannière Page Luxios',
                'schema' => ['title' => 'string', 'subtitle' => 'string', 'backgroundImage' => 'string', 'overlayOpacity' => 'number'],
                'default_content' => [
                    'title' => 'Notre Histoire',
                    'subtitle' => '',
                    'backgroundImage' => '/images/about-hero.jpg',
                    'overlayOpacity' => 0.55,
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-footer',
                'name' => 'Footer Luxios Hotel',
                'schema' => ['brandName' => 'string', 'tagline' => 'string', 'logoUrl' => 'string', 'copyright' => 'string', 'email' => 'string', 'address' => 'string', 'links' => 'string'],
                'default_content' => [
                    'brandName' => 'luxios',
                    'tagline' => 'resort',
                    'logoUrl' => '/images/logo-icon.png',
                    'copyright' => '© Luxios Resort. Tous droits réservés.',
                    'email' => 'contact@luxiosresort.com',
                    'address' => '1 Avenue de l\'Océan, Île Paradis',
                    'links' => '[{"label":"À propos","href":"/about"},{"label":"Chambres","href":"/rooms"},{"label":"Services","href":"/services"},{"label":"Actualités","href":"/news"},{"label":"Contact","href":"/contact"}]'
                ],
                'default_styles' => []
            ],
            [
                'id' => 'luxios-contact',
                'name' => 'Contact Luxios Hotel',
                'schema' => [
                    'subtitle' => 'string', 'title' => 'string', 'description' => 'string',
                    'phone' => 'string', 'email' => 'string', 'address' => 'string',
                    'hours' => 'string', 'btnText' => 'string',
                ],
                'default_content' => [
                    'subtitle' => 'luxios resort',
                    'title' => 'Contactez-nous',
                    'description' => 'Nous serions ravis de vous entendre. Que vous planifiiez votre prochain séjour ou que vous ayez une question sur nos services, notre équipe est là pour vous aider.',
                    'phone' => '+123 456 789',
                    'email' => 'info@luxiosresort.com',
                    'address' => '123 Avenue Côtière, Île Paradis',
                    'hours' => '24h/24, 7j/7',
                    'btnText' => 'Envoyer le message',
                ],
                'default_styles' => []
            ],
        ];
        foreach ($sectionTypes as $type) {
            SectionType::updateOrCreate(
                ['id' => $type['id']],
                $type
            );
        }

        $this->command->info('✅ ' . count($sectionTypes) . ' types de sections créés');
    }
    private function seedAllTemplates(): void
    {
        // Définition des templates avec contenu spécifique par page
        // Format sections: string = type ID seul (défauts) | array = ['type' => ..., 'content' => [...]] avec overrides
        $templates = [
            // ===== LUXIOS HOTEL — Template V1 =====
            [
                'id' => 'luxios-hotel',
                'name' => 'Luxios Hotel & Resort',
                'description' => 'Template hôtel de luxe avec design sombre élégant, police serif, accents dorés. Idéal pour hôtels, resorts et spa.',
                'category' => 'Hôtel & Resort',
                'thumbnail' => 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
                'version' => '1.0.0',
                'pages' => [
                    [
                        'name' => 'Accueil',
                        'slug' => '/',
                        'sections' => [
                            'luxios-navbar',
                            'luxios-hero',
                            'luxios-booking',
                            'luxios-welcome',
                            'luxios-rooms',
                            'luxios-amenities',
                            'luxios-services',
                            'luxios-news',
                            'luxios-footer',
                        ]
                    ],
                    [
                        'name' => 'À propos',
                        'slug' => '/about',
                        'sections' => [
                            'luxios-navbar',
                            ['type' => 'luxios-page-hero', 'content' => [
                                'title' => 'À Propos de Nous',
                                'subtitle' => 'notre histoire',
                                'backgroundImage' => '/images/about-hero.jpg',
                            ]],
                            ['type' => 'luxios-welcome', 'content' => [
                                'subtitle' => 'notre histoire',
                                'title' => 'né d\'une passion pour le luxe',
                                'description' => 'Fondé en 1987, Luxios Resort accueille des hôtes du monde entier en quête d\'un équilibre parfait entre luxe, nature et expériences authentiques. Notre philosophie : chaque séjour doit devenir un souvenir impérissable.',
                            ]],
                            'luxios-amenities',
                            'luxios-footer',
                        ]
                    ],
                    [
                        'name' => 'Chambres',
                        'slug' => '/rooms',
                        'sections' => [
                            'luxios-navbar',
                            ['type' => 'luxios-page-hero', 'content' => [
                                'title' => 'Chambres & Suites',
                                'subtitle' => 'luxios resort',
                                'backgroundImage' => '/images/oceanview-suite.jpg',
                            ]],
                            'luxios-rooms',
                            'luxios-booking',
                            'luxios-footer',
                        ]
                    ],
                    [
                        'name' => 'Services',
                        'slug' => '/services',
                        'sections' => [
                            'luxios-navbar',
                            ['type' => 'luxios-page-hero', 'content' => [
                                'title' => 'Nos Services',
                                'subtitle' => 'gastronomie & bien-être',
                                'backgroundImage' => '/images/restaurant.jpg',
                            ]],
                            'luxios-services',
                            'luxios-amenities',
                            'luxios-footer',
                        ]
                    ],
                    [
                        'name' => 'Actualités',
                        'slug' => '/news',
                        'sections' => [
                            'luxios-navbar',
                            ['type' => 'luxios-page-hero', 'content' => [
                                'title' => 'Actualités & Articles',
                                'subtitle' => 'notre blog',
                                'backgroundImage' => '/images/blog1.jpg',
                            ]],
                            'luxios-news',
                            'luxios-footer',
                        ]
                    ],
                    [
                        'name' => 'Contact',
                        'slug' => '/contact',
                        'sections' => [
                            'luxios-navbar',
                            ['type' => 'luxios-page-hero', 'content' => [
                                'title' => 'Contactez-nous',
                                'subtitle' => 'nous sommes à votre écoute',
                                'backgroundImage' => '/images/contact-hero.jpg',
                            ]],
                            ['type' => 'luxios-contact', 'content' => [
                                'subtitle' => 'luxios resort',
                                'title' => 'Contactez-nous',
                                'description' => 'Nous serions ravis de vous entendre. Que vous planifiiez votre prochain séjour ou que vous ayez une question sur nos services, notre équipe est là pour vous aider.',
                                'phone' => '+123 456 789',
                                'email' => 'info@luxiosresort.com',
                                'address' => '123 Avenue Côtière, Île Paradis',
                                'hours' => '24h/24, 7j/7',
                                'btnText' => 'Envoyer le message',
                            ]],
                            'luxios-footer',
                        ]
                    ],
                ]
            ],
        ];

        // Delete all non-luxios templates from DB
        // First null out foreign key references from user_sites
        DB::table('user_sites')
            ->where('source_template_id', '!=', 'luxios-hotel')
            ->update(['source_template_id' => 'luxios-hotel']);
        SiteTemplate::where('id', '!=', 'luxios-hotel')->delete();

        foreach ($templates as $templateData) {
            // Créer ou mettre à jour le template
            $template = SiteTemplate::updateOrCreate(
                ['id' => $templateData['id']],
                [
                    'name' => $templateData['name'],
                    'description' => $templateData['description'],
                    'category' => $templateData['category'],
                    'thumbnail' => $templateData['thumbnail'],
                    'version' => $templateData['version'],
                    'status' => 'active'
                ]
            );

            // Supprimer les anciennes pages
            TemplatePage::where('template_id', $template->id)->delete();

            // Auto-generate navbar links from template pages
            $navbarLinks = array_map(fn($p) => ['label' => $p['name'], 'url' => $p['slug']], $templateData['pages']);

            // Créer les pages et sections
            foreach ($templateData['pages'] as $pageOrder => $pageData) {
                $pageId = $template->id . '-page-' . $pageOrder;

                $page = TemplatePage::create([
                    'id' => $pageId,
                    'template_id' => $template->id,
                    'name' => $pageData['name'],
                    'slug' => $pageData['slug'],
                    'order' => $pageOrder
                ]);

                foreach ($pageData['sections'] as $sectionOrder => $sectionDef) {
                    // Support string (type ID only) or array with overrides
                    if (is_array($sectionDef)) {
                        $sectionTypeId = $sectionDef['type'];
                        $sectionContent = $sectionDef['content'] ?? [];
                        $sectionStyles = $sectionDef['styles'] ?? [];
                    } else {
                        $sectionTypeId = $sectionDef;
                        $sectionContent = [];
                        $sectionStyles = [];
                    }

                    // Auto-set navbar links to match template's actual pages
                    if (str_contains($sectionTypeId, 'navbar')) {
                        $sectionContent['links'] = $navbarLinks;
                        if (!isset($sectionContent['ctaLink'])) {
                            $sectionContent['ctaLink'] = '/contact';
                        }
                    }

                    TemplateSection::create([
                        'id' => $pageId . '-section-' . $sectionOrder,
                        'template_page_id' => $page->id,
                        'section_type_id' => $sectionTypeId,
                        'order' => $sectionOrder,
                        'default_content' => $sectionContent,
                        'default_styles' => $sectionStyles
                    ]);
                }
            }
        }

        $this->command->info('✅ ' . count($templates) . ' templates créés avec leurs pages et sections');
    }
}
