<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Formulaire de Réservation</title>
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
        }
        
        .container {
            max-width: 520px;
            margin: 0 auto;
            background: #ffffff;
            padding: 20px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
        }
        
        .form-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            text-align: center;
            color: #1f2937;
        }
        
        .completion-notice {
            background: #eff6ff;
            border: 1px solid #3b82f6;
            color: #1e40af;
            padding: 10px 12px;
            border-radius: 8px;
            margin-bottom: 15px;
            font-size: 13px;
            font-weight: 500;
            text-align: center;
        }
        
        .form-row {
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
            margin-bottom: 12px;
        }
        
        .form-group {
            margin-bottom: 12px;
            flex: 1;
            min-width: 0;
        }
        
        .form-group.full-width {
            flex: 1 1 100%;
        }
        
        label {
            display: block;
            margin-bottom: 4px;
            font-weight: 600;
            color: #374151;
            font-size: 13px;
        }
        
        input, select, textarea {
            width: 100%;
            padding: 10px 12px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 13px;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.8);
            font-family: inherit;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            background: rgba(255, 255, 255, 1);
            transform: translateY(-1px);
        }
        
        input[readonly] {
            background: #f9fafb;
            color: #6b7280;
            border-color: #d1d5db;
        }
        
        textarea {
            resize: vertical;
            min-height: 65px;
            max-height: 100px;
        }
        
        .btn {
            width: 100%;
            padding: 12px;
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
            margin-top: 8px;
            color: #6b7280;
            font-size: 13px;
            font-weight: 500;
        }
        
        .success-message {
            background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
            border: 2px solid #10b981;
            color: #065f46;
            padding: 15px;
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
        @media (max-width: 600px) {
            body {
                padding: 8px;
                font-size: 13px;
            }
            
            .container {
                padding: 16px;
            }
            
            .form-row {
                flex-direction: column;
                gap: 0;
            }
            
            .form-title {
                font-size: 18px;
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
                padding: 12px;
            }
            
            input, select, textarea {
                padding: 8px 10px;
                font-size: 12px;
            }
            
            .btn {
                padding: 10px;
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
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .container {
            animation: fadeIn 0.5s ease-out;
        }
    </style>
</head>
<body>
    <div class="container">
        <h2 class="form-title">Formulaire de Réservation</h2>
        
        @if($completion_token)
        <div class="completion-notice">
            <strong>✨ Complétez votre réservation</strong><br>
            Nous avons pré-rempli vos informations précédentes
        </div>
        @endif
        
        <div class="success-message" id="successMessage">
            <div style="font-size: 16px; margin-bottom: 5px;">🎉 Réservation confirmée !</div>
            <div>Nous vous contacterons bientôt pour confirmer les détails.</div>
        </div>
        
        <form id="fullReservationForm">
            <input type="hidden" name="client_id" value="{{ $client_id ?? '' }}">
            @if($completion_token)
            <input type="hidden" name="completion_token" value="{{ $completion_token }}">
            @endif
            
            <!-- Nom complet (ligne seule) -->
            <div class="form-group full-width">
                <label for="name">Nom complet <span class="required">*</span></label>
                <input 
                    type="text" 
                    id="name" 
                    name="name" 
                    required 
                    maxlength="255"
                    placeholder="Votre nom complet"
                >
            </div>
            
            <!-- Email et Téléphone (même ligne) -->
            <div class="form-row">
                <div class="form-group">
                    <label for="email">Email <span class="required">*</span></label>
                    <input 
                        type="email" 
                        id="email" 
                        name="email" 
                        required 
                        maxlength="255"
                        placeholder="votre@email.com"
                    >
                </div>
                <div class="form-group">
                    <label for="phone">Téléphone</label>
                    <input 
                        type="tel" 
                        id="phone" 
                        name="phone" 
                        maxlength="20"
                        placeholder="06 XX XX XX XX"
                    >
                </div>
            </div>
            
            <!-- Date, Heure et Personnes (même ligne) -->
            <div class="form-row">
                <div class="form-group">
                    <label for="date">Date <span class="required">*</span></label>
                    <input 
                        type="date" 
                        id="date" 
                        name="date" 
                        required 
                        min="{{ date('Y-m-d', strtotime('+1 day')) }}"
                    >
                </div>
                <div class="form-group">
                    <label for="time">Heure <span class="required">*</span></label>
                    <input 
                        type="time" 
                        id="time" 
                        name="time" 
                        required
                    >
                </div>
                <div class="form-group">
                    <label for="guests">Personnes <span class="required">*</span></label>
                    <select id="guests" name="guests" required>
                        <option value="">Nb</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                        <option value="4">4</option>
                        <option value="5">5</option>
                        <option value="6">6</option>
                        <option value="7">7</option>
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10+</option>
                    </select>
                </div>
            </div>
            
            <!-- Description de la demande -->
            <div class="form-group full-width">
                <label for="interest_description">Description de votre demande <span class="required">*</span></label>
                <textarea 
                    id="interest_description" 
                    name="interest_description" 
                    placeholder="Décrivez brièvement votre demande..."
                    required
                    maxlength="500"
                ></textarea>
            </div>
            
            <!-- Détails supplémentaires -->
            <div class="form-group full-width">
                <label for="additional_details">Informations complémentaires</label>
                <textarea 
                    id="additional_details" 
                    name="additional_details" 
                    placeholder="Allergies, demandes spéciales... (optionnel)"
                    maxlength="1000"
                ></textarea>
            </div>
            
            <button type="submit" class="btn" id="submitBtn">
                <span id="submitText">Envoyer ma réservation</span>
            </button>
            
            <div class="loading" id="loading">
                <div style="display: inline-block; margin-right: 8px;">⏳</div>
                Envoi en cours...
            </div>
        </form>
    </div>

    <script>
        const API_URL = '{{ $api_url }}';
        const COMPLETION_TOKEN = '{{ $completion_token ?? '' }}';
        const form = document.getElementById('fullReservationForm');
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
            submitText.textContent = isLoading ? 'Envoi...' : 'Envoyer ma réservation';
        }

        function showSuccess() {
            // Masquer le message de completion et le formulaire
            const completionNotice = document.querySelector('.completion-notice');
            if (completionNotice) {
                completionNotice.style.display = 'none';
            }
            
            form.style.display = 'none';
            successMessage.style.display = 'block';
        }

        // Auto-completion si token présent
        if (COMPLETION_TOKEN) {
            fetch(`${API_URL}/reservations/completion-data?token=${COMPLETION_TOKEN}`)
                .then(response => response.json())
                .then(result => {
                    if (result.success && result.data.existing_data) {
                        const data = result.data.existing_data;
                        
                        if (data.date) {
                            document.getElementById('date').value = data.date;
                            document.getElementById('date').setAttribute('readonly', true);
                        }
                        if (data.guests) {
                            document.getElementById('guests').value = data.guests;
                            document.getElementById('guests').setAttribute('readonly', true);
                        }
                        if (data.interest_description) {
                            document.getElementById('interest_description').value = data.interest_description;
                            document.getElementById('interest_description').setAttribute('readonly', true);
                        }
                        
                        showToast('Données pré-remplies avec succès', 'success');
                    }
                })
                .catch(error => {
                    showToast('Impossible de charger les données existantes', 'warning');
                });
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            setLoading(true);

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            // Choisir l'endpoint selon le contexte
            const endpoint = COMPLETION_TOKEN ? 
                `${API_URL}/reservations/complete` : 
                `${API_URL}/reservations/full`;

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showToast(result.message, 'success', 3000);
                    
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

        // Validation en temps réel avec feedback visuel
        document.getElementById('date').addEventListener('change', function() {
            const selectedDate = new Date(this.value);
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            
            if (selectedDate < tomorrow) {
                showToast('La date doit être dans le futur', 'warning');
                this.value = '';
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '#10b981';
            }
        });

        document.getElementById('email').addEventListener('blur', function() {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (this.value && !emailRegex.test(this.value)) {
                showToast('Format d\'email invalide', 'warning');
                this.style.borderColor = '#ef4444';
            } else if (this.value) {
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