<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Formulaire de Contact</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #ffffff;
            padding: 15px;
            color: #2d3748;
            line-height: 1.4;
            font-size: 14px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
        }
        
        .form-title {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 6px;
            text-align: center;
            color: #1f2937;
        }
        
        .form-subtitle {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 20px;
            text-align: center;
            font-weight: 500;
        }
        
        .form-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 16px;
        }
        
        .form-group {
            margin-bottom: 16px;
            flex: 1;
            min-width: 0;
        }
        
        .form-group.half {
            flex: 1;
            min-width: 200px;
        }
        
        .form-group.full-width {
            flex: 1 1 100%;
        }
        
        label {
            display: block;
            margin-bottom: 6px;
            font-weight: 600;
            color: #374151;
            font-size: 13px;
        }
        
        input, select, textarea {
            width: 100%;
            padding: 12px 14px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 13px;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.9);
            font-family: inherit;
            box-sizing: border-box;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            background: rgba(255, 255, 255, 1);
            transform: translateY(-1px);
        }
        
        textarea {
            resize: vertical;
            min-height: 100px;
            max-height: 200px;
            line-height: 1.5;
        }
        
        .btn {
            width: 100%;
            padding: 14px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-top: 8px;
            font-family: inherit;
        }
        
        .btn:hover:not(:disabled) {
            background: #2563eb;
            transform: translateY(-1px);
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }
        
        .btn:disabled {
            background: #9ca3af;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }
        
        .required {
            color: #ef4444;
            font-weight: 700;
        }
        
        .loading {
            display: none;
            text-align: center;
            margin-top: 10px;
            color: #6b7280;
            font-size: 13px;
            font-weight: 500;
        }
        
        .success-message {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border: 2px solid #10b981;
            color: #065f46;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            font-weight: 600;
            display: none;
            margin-bottom: 15px;
        }
        
        /* Toast Notifications */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 10px;
            color: white;
            font-weight: 600;
            font-size: 13px;
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
        }
        
        .toast.show {
            opacity: 1;
            transform: translateX(0);
        }
        
        .toast.success {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }
        
        .toast.error {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }
        
        .toast.warning {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }
        
        /* Responsive Design */
        @media (max-width: 640px) {
            body {
                padding: 10px;
                font-size: 13px;
            }
            
            .container {
                padding: 20px;
            }
            
            .form-row {
                flex-direction: column;
                gap: 0;
            }
            
            .form-group.half {
                min-width: 100%;
            }
            
            .form-title {
                font-size: 20px;
            }
            
            .toast {
                top: 10px;
                right: 10px;
                left: 10px;
                max-width: none;
            }
        }
        
        @media (max-width: 400px) {
            .container {
                padding: 16px;
            }
            
            input, select, textarea {
                padding: 10px 12px;
                font-size: 12px;
            }
            
            .btn {
                padding: 12px 16px;
                font-size: 13px;
            }
        }
        
        /* Animation for form interactions */
        .form-group {
            transition: transform 0.2s ease;
        }
        
        .form-group:focus-within {
            transform: translateY(-1px);
        }
        
        /* Subtle animations */
        @keyframes fadeInScale {
            from { 
                opacity: 0; 
                transform: scale(0.98) translateY(10px); 
            }
            to { 
                opacity: 1; 
                transform: scale(1) translateY(0); 
            }
        }
        
        .container {
            animation: fadeInScale 0.5s ease-out;
        }
        
        /* Character counter */
        .char-counter {
            font-size: 11px;
            color: #6b7280;
            margin-top: 4px;
            text-align: right;
        }
        
        .char-counter.warning {
            color: #f59e0b;
        }
        
        .char-counter.error {
            color: #ef4444;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="form-title">Contactez-nous</h2>
        <p class="form-subtitle">Nous vous répondrons dans les plus brefs délais</p>
        
        <div class="success-message" id="successMessage">
            <div style="font-size: 16px; margin-bottom: 8px;">✉️ Message envoyé !</div>
            <div>Nous vous répondrons dans les plus brefs délais.</div>
        </div>
        
        <form id="contactForm">
            <input type="hidden" name="client_id" value="{{ $client_id ?? '' }}">
            
            <!-- Nom et Prénom (même ligne) -->
            <div class="form-row">
                <div class="form-group half">
                    <label for="nom">Nom <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="nom" 
                        name="nom" 
                        required 
                        maxlength="100"
                        placeholder="Votre nom de famille"
                    >
                </div>
                <div class="form-group half">
                    <label for="prenom">Prénom <span class="required">*</span></label>
                    <input 
                        type="text" 
                        id="prenom" 
                        name="prenom" 
                        required 
                        maxlength="100"
                        placeholder="Votre prénom"
                    >
                </div>
            </div>
            
            <!-- Téléphone (ligne seule) -->
            <div class="form-group full-width">
                <label for="telephone">Téléphone <span class="required">*</span></label>
                <input 
                    type="tel" 
                    id="telephone" 
                    name="telephone" 
                    required 
                    maxlength="20"
                    placeholder="06 XX XX XX XX"
                    pattern="[0-9\s\-\+\(\)]{10,20}"
                >
            </div>
            
            <!-- Sujet (ligne seule) -->
            <div class="form-group full-width">
                <label for="sujet">Sujet <span class="required">*</span></label>
                <input 
                    type="text" 
                    id="sujet" 
                    name="sujet" 
                    required 
                    maxlength="200"
                    placeholder="Objet de votre message"
                >
                <div class="char-counter" id="sujetCounter">0/200</div>
            </div>
            
            
            <button type="submit" class="btn" id="submitBtn">
                <span id="submitText">Envoyer le message</span>
            </button>
            
            <div class="loading" id="loading">
                <div style="display: inline-block; margin-right: 8px;">⏳</div>
                Envoi en cours...
            </div>
        </form>
    </div>

    <script>
        const API_URL = '{{ $api_url }}';
        const form = document.getElementById('contactForm');
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const loading = document.getElementById('loading');
        const successMessage = document.getElementById('successMessage');

        // Toast notification system
        function showToast(message, type = 'success', duration = 4000) {
            // Remove existing toasts
            const existingToasts = document.querySelectorAll('.toast');
            existingToasts.forEach(toast => toast.remove());

            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);

            // Show toast
            setTimeout(() => toast.classList.add('show'), 100);

            // Hide toast
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        function setLoading(isLoading) {
            submitBtn.disabled = isLoading;
            loading.style.display = isLoading ? 'block' : 'none';
            submitText.textContent = isLoading ? 'Envoi...' : 'Envoyer le message';
        }

        function showSuccess() {
            form.style.display = 'none';
            successMessage.style.display = 'block';
        }

        // Character counters
        function setupCharCounter(inputId, counterId, maxLength) {
            const input = document.getElementById(inputId);
            const counter = document.getElementById(counterId);
            
            input.addEventListener('input', function() {
                const length = this.value.length;
                counter.textContent = `${length}/${maxLength}`;
                
                if (length > maxLength * 0.9) {
                    counter.className = 'char-counter error';
                } else if (length > maxLength * 0.75) {
                    counter.className = 'char-counter warning';
                } else {
                    counter.className = 'char-counter';
                }
            });
        }

        setupCharCounter('sujet', 'sujetCounter', 200);

        // Form submission
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            setLoading(true);

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${API_URL}/contact`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showToast('✅ Message envoyé avec succès !', 'success', 3000);
                    
                    // Afficher message de succès et masquer formulaire
                    setTimeout(() => {
                        showSuccess();
                    }, 1500);
                } else {
                    if (result.errors) {
                        const errorMessages = Object.values(result.errors).flat();
                        errorMessages.forEach((error, index) => {
                            setTimeout(() => {
                                showToast(error, 'error', 4000);
                            }, index * 500);
                        });
                    } else {
                        showToast(result.message || 'Une erreur est survenue', 'error');
                    }
                }
            } catch (error) {
                showToast('Erreur de connexion. Veuillez réessayer.', 'error');
            } finally {
                setLoading(false);
            }
        });

        // Real-time validation with visual feedback
        document.getElementById('telephone').addEventListener('input', function() {
            const phoneRegex = /^[0-9\s\-\+\(\)]{10,20}$/;
            if (this.value && !phoneRegex.test(this.value)) {
                this.style.borderColor = '#f59e0b';
                showToast('Format de téléphone invalide', 'warning', 2000);
            } else if (this.value) {
                this.style.borderColor = '#10b981';
            }
        });

        document.getElementById('nom').addEventListener('input', function() {
            if (this.value.length >= 2) {
                this.style.borderColor = '#10b981';
            }
        });

        document.getElementById('prenom').addEventListener('input', function() {
            if (this.value.length >= 2) {
                this.style.borderColor = '#10b981';
            }
        });

        document.getElementById('sujet').addEventListener('input', function() {
            if (this.value.length >= 5) {
                this.style.borderColor = '#10b981';
            }
        });

        // Animation d'entrée pour les champs
        const formGroups = document.querySelectorAll('.form-group');
        formGroups.forEach((group, index) => {
            group.style.opacity = '0';
            group.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                group.style.transition = 'all 0.4s ease';
                group.style.opacity = '1';
                group.style.transform = 'translateY(0)';
            }, index * 100);
        });
    </script>
</body>
</html>