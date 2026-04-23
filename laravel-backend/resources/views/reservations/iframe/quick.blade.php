<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="robots" content="noindex, nofollow">
    <title>Réservation Rapide</title>
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
            width: 100%;
            max-width: 1200px;
            background: #ffffff;
            padding: 24px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
            border: 1px solid #e5e7eb;
            margin: 0 auto;
        }
        
        .form-title {
            font-size: 22px;
            font-weight: 600;
            margin-bottom: 6px;
            color: #1f2937;
        }
        
        .form-subtitle {
            color: #6b7280;
            font-size: 13px;
            margin-bottom: 20px;
            font-weight: 500;
        }
        
        .form-row {
            display: flex;
            flex-wrap: nowrap;
            gap: 12px;
            margin-bottom: 16px;
            align-items: end;
        }
        
        .form-group {
            flex: 1;
            margin-bottom: 0;
        }
        
        .form-group.date-field {
            flex: 0 0 200px;
            max-width: 200px;
        }
        
        .form-group.guests-field {
            flex: 0 0 180px;
            max-width: 180px;
        }
        
        .form-group.description-field {
            flex: 1;
            min-width: 250px;
        }
        
        .btn-wrapper {
            flex: 0 0 auto;
            margin-left: 8px;
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
            border-radius: 12px;
            font-size: 12px;
            transition: all 0.3s ease;
            background: rgba(255, 255, 255, 0.9);
            font-family: inherit;
            height: 54px;
            box-sizing: border-box;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
            box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.1);
            background: rgba(255, 255, 255, 1);
            transform: translateY(-2px);
        }
        
        textarea {
            resize: none;
            height: 54px !important;
            min-height: 54px;
            max-height: 54px;
            line-height: 1.4;
            padding-top: 12px;
            padding-bottom: 12px;
        }
        
        .btn {
            width: auto;
            padding: 16px 24px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: inherit;
            white-space: nowrap;
            height: 54px;
            display: flex;
            align-items: center;
            justify-content: center;
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
        
        /* Toast Notifications */
        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 16px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            font-size: 13px;
            z-index: 1000;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
            max-width: 300px;
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
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
        
        .toast.info {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
        }
        
        /* Responsive Design */
        @media (max-width: 1024px) {
            .form-group.date-field {
                flex: 0 0 180px;
                max-width: 180px;
            }
            
            .form-group.guests-field {
                flex: 0 0 160px;
                max-width: 160px;
            }
            
            .form-group.description-field {
                min-width: 200px;
            }
        }
        
        @media (max-width: 768px) {
            .form-row {
                flex-direction: column;
                gap: 16px;
                align-items: stretch;
            }
            
            .form-group, .form-group.date-field, .form-group.guests-field, .form-group.description-field {
                flex: 1;
                max-width: 100%;
                min-width: 100%;
            }
            
            .btn-wrapper {
                margin-left: 0;
            }
            
            .btn {
                width: 100%;
                height: auto;
                padding: 14px 24px;
            }
            
            textarea {
                height: 80px;
                min-height: 80px;
                max-height: 120px;
                resize: vertical;
            }
        }
        
        @media (max-width: 480px) {
            body {
                padding: 10px;
            }
            
            .container {
                padding: 20px;
                border-radius: 16px;
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
        
        /* Animation for form interactions */
        .form-group {
            transition: transform 0.2s ease;
        }
        
        .form-group:focus-within {
            transform: translateY(-2px);
        }
        
        /* Subtle animations */
        @keyframes fadeInScale {
            from { 
                opacity: 0; 
                transform: scale(0.9) translateY(20px); 
            }
            to { 
                opacity: 1; 
                transform: scale(1) translateY(0); 
            }
        }
        
        .container {
            animation: fadeInScale 0.6s ease-out;
        }
        
        /* Progress indicator */
        .step-indicator {
            text-align: center;
            margin-bottom: 16px;
            font-size: 12px;
            color: #6b7280;
            font-weight: 500;
        }
        
        .step-dots {
            display: flex;
            justify-content: center;
            gap: 8px;
            margin-bottom: 8px;
        }
        
        .dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #d1d5db;
        }
        
        .dot.active {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="step-indicator">
            <div class="step-dots">
                <div class="dot active"></div>
                <div class="dot"></div>
            </div>
            <div>Étape 1 sur 2</div>
        </div>
        
        <h2 class="form-title">Réservation Rapide</h2>
        <p class="form-subtitle">Commencez votre réservation en 30 secondes</p>
        
        <form id="quickReservationForm">
            <input type="hidden" name="client_id" value="{{ $client_id ?? '' }}">
            
            <div class="form-row">
                <div class="form-group date-field">
                    <label for="date">Date souhaitée <span class="required">*</span></label>
                    <input 
                        type="date" 
                        id="date" 
                        name="date" 
                        required 
                        min="{{ date('Y-m-d', strtotime('+1 day')) }}"
                    >
                </div>
                
                <div class="form-group guests-field">
                    <label for="guests">Nombre de personnes <span class="required">*</span></label>
                    <select id="guests" name="guests" required>
                        <option value="">Combien ?</option>
                        <option value="1">1 personne</option>
                        <option value="2">2 personnes</option>
                        <option value="3">3 personnes</option>
                        <option value="4">4 personnes</option>
                        <option value="5">5 personnes</option>
                        <option value="6">6 personnes</option>
                        <option value="7">7 personnes</option>
                        <option value="8">8 personnes</option>
                        <option value="9">9 personnes</option>
                        <option value="10">10+ personnes</option>
                    </select>
                </div>
                
                <div class="form-group description-field">
                    <label for="interest_description">Description de votre demande <span class="required">*</span></label>
                    <textarea 
                        id="interest_description" 
                        name="interest_description" 
                        placeholder="Dîner romantique, anniversaire, réunion d'affaires..."
                        required
                        maxlength="500"
                    ></textarea>
                </div>
                
                <div class="btn-wrapper">
                    <label style="visibility: hidden;">Action</label>
                    <button type="submit" class="btn" id="submitBtn">
                        <span id="submitText">Continuer →</span>
                    </button>
                </div>
            </div>
            
            <div class="loading" id="loading">
                <div style="display: inline-block; margin-right: 8px;">⏳</div>
                Préparation...
            </div>
        </form>
    </div>

    <script>
        const API_URL = '{{ $api_url }}';
        const form = document.getElementById('quickReservationForm');
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const loading = document.getElementById('loading');

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
            submitText.textContent = isLoading ? 'Préparation...' : 'Continuer →';
        }

        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            setLoading(true);

            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(`${API_URL}/reservations/quick`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    showToast('✅ Étape 1 terminée ! Redirection...', 'success', 2000);
                    
                    // Redirection intelligente vers formulaire complet
                    if (result.data.completion_url) {
                        setTimeout(() => {
                            window.open(result.data.completion_url, '_parent');
                        }, 1500);
                    }
                } else {
                    showToast(result.message || 'Une erreur est survenue', 'error');
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
                showToast('⚠️ La date doit être dans le futur', 'error');
                this.value = '';
                this.style.borderColor = '#ef4444';
            } else {
                this.style.borderColor = '#10b981';
                showToast('📅 Date validée', 'success', 2000);
            }
        });

        document.getElementById('guests').addEventListener('change', function() {
            if (this.value) {
                this.style.borderColor = '#10b981';
                const guestText = this.value === '1' ? 'personne' : 'personnes';
                showToast(`👥 ${this.value} ${guestText} sélectionnée(s)`, 'success', 2000);
            }
        });

        document.getElementById('interest_description').addEventListener('input', function() {
            const remaining = 500 - this.value.length;
            if (remaining < 50 && remaining > 0) {
                showToast(`${remaining} caractères restants`, 'info', 1500);
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
            }, (index + 1) * 150);
        });
    </script>
</body>
</html>