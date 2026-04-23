<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Compléter votre Réservation - Pixel Rise</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        'brand-blue': '#2563eb',
                        'brand-yellow': '#f59e0b', 
                        'brand-black': '#0f172a',
                        'blue-600': '#2563eb',
                        'blue-700': '#1d4ed8',
                        'yellow-500': '#f59e0b',
                        'yellow-600': '#d97706',
                        'slate-800': '#1e293b',
                        'slate-900': '#0f172a'
                    },
                    backgroundImage: {
                        'gradient-cta': 'linear-gradient(135deg, #f59e0b 0%, #f97316 50%, #ef4444 100%)',
                        'gradient-business': 'linear-gradient(135deg, #2563eb 0%, #7c3aed 50%, #4f46e5 100%)',
                        'gradient-black': 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%)',
                        'gradient-hero': 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 30%, #f3e8ff 100%)'
                    },
                    animation: {
                        'fade-in': 'fade-in 0.8s ease-out',
                        'scale-in': 'scale-in 0.6s ease-out',
                        'float': 'float 6s ease-in-out infinite'
                    },
                    keyframes: {
                        'fade-in': {
                            '0%': { opacity: '0', transform: 'translateY(10px)' },
                            '100%': { opacity: '1', transform: 'translateY(0)' }
                        },
                        'scale-in': {
                            '0%': { transform: 'scale(0.95)', opacity: '0' },
                            '100%': { transform: 'scale(1)', opacity: '1' }
                        },
                        'float': {
                            '0%, 100%': { transform: 'translateY(0)' },
                            '50%': { transform: 'translateY(-10px)' }
                        }
                    }
                }
            }
        }
    </script>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-gradient-hero min-h-screen">
    <!-- Navbar Pixel-Rise SYNCHRONISÉE -->
    <nav class="bg-white/90 backdrop-blur-lg border-b border-white/20 sticky top-0 z-50">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="flex justify-between items-center h-16">
                <!-- Logo synchronisé avec React -->
                <div class="flex items-center">
                    <div class="flex-shrink-0">
                        <a href="http://localhost:8080/" target="_blank" rel="noopener noreferrer" class="flex items-center space-x-3 group">
                            <div class="relative">
                                <div class="w-10 h-10 bg-gradient-business rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                                    <span class="text-white font-bold text-lg">P</span>
                                    <!-- Effet de brillance -->
                                    <div class="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                </div>
                                <!-- Indicator IA Active -->
                                <div class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
                            </div>
                            
                            <div class="hidden md:block">
                                <h1 class="font-bold text-2xl bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent">
                                    Pixel<span class="text-blue-600">Rise</span>
                                </h1>
                                <p class="text-xs text-slate-500 font-medium tracking-wide">IA MARKETING AUTOMATION</p>
                            </div>
                        </a>
                    </div>
                </div>

                <!-- Navigation Desktop synchronisée -->
                <div class="hidden md:block">
                    <div class="ml-10 flex items-baseline space-x-6">
                        <a href="http://localhost:8080/blog" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-brand-blue px-3 py-2 text-sm font-medium transition-colors">
                            Blog
                        </a>
                        <a href="http://localhost:8080/#features" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-brand-blue px-3 py-2 text-sm font-medium transition-colors relative">
                            Fonctionnalités
                            <span class="ml-1 px-1.5 py-0.5 text-xs bg-purple-500 text-white rounded-full font-bold">HOT</span>
                        </a>
                        <a href="http://localhost:8080/how-it-works" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-brand-blue px-3 py-2 text-sm font-medium transition-colors">
                            Comment ça marche
                        </a>
                        <a href="http://localhost:8080/pricing" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-brand-blue px-3 py-2 text-sm font-medium transition-colors relative">
                            Tarifs
                            <span class="ml-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full font-bold animate-pulse">GRATUIT</span>
                        </a>
                        <a href="http://localhost:8080/contact" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-brand-blue px-3 py-2 text-sm font-medium transition-colors">
                            Contact
                        </a>
                        <a href="http://localhost:8080/about" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-brand-blue px-3 py-2 text-sm font-medium transition-colors">
                            About
                        </a>
                    </div>
                </div>

                <!-- CTA Button synchronisé -->
                <div class="hidden md:flex items-center gap-3">
                    <a href="http://localhost:8080/login" target="_blank" rel="noopener noreferrer" class="text-slate-700 hover:text-brand-blue px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/>
                        </svg>
                        Connexion
                    </a>
                    <a href="http://localhost:8080/discuter-projet" target="_blank" rel="noopener noreferrer" class="bg-gradient-cta text-white px-6 py-2 rounded-lg font-bold hover:transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center gap-2">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        Démarrer GRATUIT
                    </a>
                </div>

                <!-- Mobile menu button -->
                <div class="md:hidden">
                    <button type="button" class="text-slate-700 hover:text-brand-blue p-2" onclick="toggleMobileMenu()">
                        <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile menu synchronisé -->
        <div class="md:hidden hidden" id="mobileMenu">
            <div class="px-2 pt-2 pb-3 space-y-1 bg-white/95 backdrop-blur-lg border-t border-white/20">
                <a href="http://localhost:8080/blog" target="_blank" rel="noopener noreferrer" class="block px-3 py-2 text-base font-medium text-slate-700 hover:text-brand-blue">
                    Blog
                </a>
                <a href="http://localhost:8080/#features" target="_blank" rel="noopener noreferrer" class="block px-3 py-2 text-base font-medium text-slate-700 hover:text-brand-blue">
                    Fonctionnalités
                    <span class="ml-2 px-2 py-0.5 text-xs bg-purple-500 text-white rounded-full font-bold">HOT</span>
                </a>
                <a href="http://localhost:8080/how-it-works" target="_blank" rel="noopener noreferrer" class="block px-3 py-2 text-base font-medium text-slate-700 hover:text-brand-blue">
                    Comment ça marche
                </a>
                <a href="http://localhost:8080/pricing" target="_blank" rel="noopener noreferrer" class="block px-3 py-2 text-base font-medium text-slate-700 hover:text-brand-blue">
                    Tarifs
                    <span class="ml-2 px-2 py-0.5 text-xs bg-green-500 text-white rounded-full font-bold">GRATUIT</span>
                </a>
                <a href="http://localhost:8080/contact" target="_blank" rel="noopener noreferrer" class="block px-3 py-2 text-base font-medium text-slate-700 hover:text-brand-blue">
                    Contact
                </a>
                <a href="http://localhost:8080/about" target="_blank" rel="noopener noreferrer" class="block px-3 py-2 text-base font-medium text-slate-700 hover:text-brand-blue">
                    About
                </a>
                
                <!-- Actions mobiles -->
                <div class="pt-4 border-t border-gray-200 space-y-2">
                    <a href="http://localhost:8080/login" target="_blank" rel="noopener noreferrer" class="block w-full text-center px-4 py-2 text-brand-blue border border-brand-blue rounded-lg font-medium hover:bg-brand-blue hover:text-white transition-colors">
                        Connexion
                    </a>
                    <a href="http://localhost:8080/discuter-projet" target="_blank" rel="noopener noreferrer" class="block w-full text-center bg-gradient-cta text-white px-4 py-2 rounded-lg font-bold">
                        Démarrer GRATUIT
                    </a>
                </div>
            </div>
        </div>
    </nav>

    <!-- Hero Section -->
    <div class="relative overflow-hidden py-16">
        <!-- Background Elements -->
        <div class="absolute inset-0">
            <div class="absolute top-0 left-0 w-72 h-72 bg-brand-blue/10 rounded-full -translate-x-1/2 -translate-y-1/2 animate-float"></div>
            <div class="absolute bottom-0 right-0 w-96 h-96 bg-brand-yellow/10 rounded-full translate-x-1/2 translate-y-1/2 animate-float" style="animation-delay: -3s;"></div>
        </div>

        <div class="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="text-center mb-12 animate-fade-in">
                <div class="inline-flex items-center px-4 py-2 bg-brand-blue/10 rounded-full text-brand-blue text-sm font-semibold mb-4">
                    <span class="w-2 h-2 bg-brand-blue rounded-full mr-2 animate-pulse"></span>
                    Étape 2/2 - Finalisation
                </div>
                
                <h1 class="text-4xl md:text-5xl font-bold text-brand-black mb-4 leading-tight">
                    Complétez votre
                    <span class="bg-gradient-business bg-clip-text text-transparent">
                        Réservation
                    </span>
                </h1>
                
                <p class="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Plus qu'une étape ! Renseignez vos coordonnées pour finaliser votre réservation.
                </p>
            </div>

            <!-- Formulaire intégré -->
            <div class="max-w-3xl mx-auto animate-scale-in">
                <div class="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/50 p-8 md:p-10">
                    <!-- Indicateur de progression -->
                    <div class="flex items-center justify-center mb-8">
                        <div class="flex items-center space-x-4">
                            <div class="flex items-center">
                                <div class="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
                                    ✓
                                </div>
                                <span class="ml-2 text-sm font-medium text-green-600">Informations de base</span>
                            </div>
                            <div class="w-12 h-0.5 bg-brand-blue"></div>
                            <div class="flex items-center">
                                <div class="w-8 h-8 bg-brand-blue text-white rounded-full flex items-center justify-center text-sm font-bold animate-pulse">
                                    2
                                </div>
                                <span class="ml-2 text-sm font-medium text-brand-blue">Coordonnées</span>
                            </div>
                        </div>
                    </div>

                    <!-- iFrame du formulaire -->
                    <div class="w-full">
                        <iframe 
                            id="reservationFrame"
                            src="http://localhost:8000/iframe/reservation-full?client_id=pixel-rise&token="
                            width="100%" 
                            height="700"
                            frameborder="0"
                            class="w-full rounded-xl"
                            title="Formulaire de réservation complet">
                        </iframe>
                    </div>
                </div>

                <!-- Section d'aide -->
                <div class="mt-8 text-center">
                    <div class="bg-white/60 backdrop-blur-lg rounded-xl p-6 border border-white/40">
                        <h3 class="text-lg font-semibold text-brand-black mb-2">Besoin d'aide ?</h3>
                        <p class="text-slate-600 mb-4">Notre équipe est là pour vous accompagner</p>
                        <div class="flex flex-col sm:flex-row gap-4 justify-center">
                            <a href="tel:+261328739235" class="inline-flex items-center px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
                                </svg>
                                +261 32 87 392 35
                            </a>
                            <a href="mailto:admin@pixel-rise.com" class="inline-flex items-center px-4 py-2 bg-white text-brand-blue border border-brand-blue rounded-lg hover:bg-brand-blue hover:text-white transition-colors">
                                <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                                </svg>
                                admin@pixel-rise.com
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Footer Pixel-Rise -->
    <footer class="bg-gradient-black text-white py-12 mt-16">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
                <!-- Logo et description -->
                <div class="col-span-1 md:col-span-2">
                    <div class="flex items-center space-x-2 mb-4">
                        <div class="w-8 h-8 bg-gradient-business rounded-lg flex items-center justify-center">
                            <span class="text-white font-bold text-sm">PR</span>
                        </div>
                        <span class="text-xl font-bold">Pixel Rise</span>
                    </div>
                    <p class="text-gray-300 text-sm leading-relaxed max-w-md">
                        Votre plateforme d'automatisation intelligente. Créez, gérez et optimisez vos processus avec l'IA.
                    </p>
                    <div class="flex space-x-4 mt-6">
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                            </svg>
                        </a>
                        <a href="#" class="text-gray-400 hover:text-white transition-colors">
                            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                        </a>
                    </div>
                </div>

                <!-- Liens rapides -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">Services</h3>
                    <ul class="space-y-2 text-sm">
                        <li><a href="http://localhost:8080/#features" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Automation IA</a></li>
                        <li><a href="http://localhost:8080/blog" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Génération de contenu</a></li>
                        <li><a href="http://localhost:8080/pricing" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Réservations</a></li>
                        <li><a href="http://localhost:8080/dashboard" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Analytics</a></li>
                    </ul>
                </div>

                <!-- Support -->
                <div>
                    <h3 class="text-lg font-semibold mb-4">Support</h3>
                    <ul class="space-y-2 text-sm">
                        <li><a href="http://localhost:8080/contact" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Centre d'aide</a></li>
                        <li><a href="http://localhost:8080/how-it-works" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Documentation</a></li>
                        <li><a href="http://localhost:8080/contact" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Contact</a></li>
                        <li><a href="http://localhost:8080/about" target="_blank" rel="noopener noreferrer" class="text-gray-300 hover:text-white transition-colors">Status</a></li>
                    </ul>
                </div>
            </div>

            <div class="border-t border-gray-700 mt-8 pt-8 text-center">
                <p class="text-gray-400 text-sm">
                    © 2025 Pixel Rise. Tous droits réservés. | 
                    <a href="http://localhost:8080/privacy" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Politique de confidentialité</a> | 
                    <a href="http://localhost:8080/terms" target="_blank" rel="noopener noreferrer" class="hover:text-white transition-colors">Conditions d'utilisation</a>
                </p>
            </div>
        </div>
    </footer>

    <script>
        // Mobile menu toggle
        function toggleMobileMenu() {
            const mobileMenu = document.getElementById('mobileMenu');
            mobileMenu.classList.toggle('hidden');
        }

        // Auto-update iframe src with token from URL
        document.addEventListener('DOMContentLoaded', function() {
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const clientId = urlParams.get('client_id') || 'pixel-rise';
            
            if (token) {
                const iframe = document.getElementById('reservationFrame');
                iframe.src = `http://localhost:8000/iframe/reservation-full?client_id=${clientId}&token=${token}`;
            }
        });

        // Listen for iframe height changes
        window.addEventListener('message', function(event) {
            if (event.origin !== 'http://localhost:8000') return;
            
            if (event.data.type === 'resize') {
                const iframe = document.getElementById('reservationFrame');
                iframe.height = event.data.height;
            }
        });

        // Gestion des tokens depuis les variables Blade
        const urlParams = new URLSearchParams(window.location.search);
        const token = '{{ $completion_token }}';
        const clientId = '{{ $client_id }}';
        
        if (token) {
            const iframe = document.getElementById('reservationFrame');
            iframe.src = `{{ $api_url }}/iframe/reservation-full?client_id=${clientId}&token=${token}`;
        }

        // Gestion smooth scroll pour les ancres (comme dans React)
        document.addEventListener('click', function(e) {
            const link = e.target.closest('a[href^="http://localhost:3000/#"]');
            if (link) {
                e.preventDefault();
                const targetId = link.getAttribute('href').split('#')[1];
                if (targetId) {
                    window.location.href = `http://localhost:3000/#${targetId}`;
                }
            }
        });
    </script>
</body>
</html>