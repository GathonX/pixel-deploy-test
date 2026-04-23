<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 25px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .header p {
            margin: 8px 0 0 0;
            opacity: 0.9;
            font-size: 14px;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 12px 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .info-block {
            background: #f8fafc;
            padding: 15px;
            margin: 12px 0;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .label {
            font-weight: bold;
            color: #1e40af;
        }
        .footer {
            text-align: center;
            margin-top: 25px;
            color: #64748b;
            font-size: 12px;
            padding: 15px;
        }
        .cta-button {
            display: inline-block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white !important;
            padding: 14px 35px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
            margin-top: 20px;
        }
        .blocked-message-box {
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #1f2937;
            padding: 35px 25px;
            border-radius: 12px;
            text-align: center;
        }
        .blocked-message-box h2 {
            margin: 0 0 15px 0;
            font-size: 22px;
            color: #1f2937;
        }
        .blocked-message-box p {
            margin: 12px 0;
            font-size: 15px;
            color: #374151;
        }
        .unlock-button {
            display: inline-block;
            margin-top: 25px;
            background: #1f2937;
            color: white !important;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 16px;
        }
        .check-icon {
            color: #059669;
            font-weight: bold;
        }
        /* ✅ IMPORTANT: Le contenu caché est COMPLÈTEMENT INVISIBLE */
        .hidden-content {
            display: none !important;
            visibility: hidden !important;
            height: 0 !important;
            width: 0 !important;
            overflow: hidden !important;
            opacity: 0 !important;
            position: absolute !important;
            left: -9999px !important;
            font-size: 0 !important;
            line-height: 0 !important;
            max-height: 0 !important;
            mso-hide: all !important;
        }
    </style>
    <!--[if mso]>
    <style type="text/css">
        .hidden-content { display: none !important; mso-hide: all !important; }
    </style>
    <![endif]-->
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Nouvelle Réservation</h1>
            <p>Vous avez reçu une nouvelle demande de réservation</p>
        </div>

        <div class="content">
            @if($hasAccess)
                {{-- ✅ CONTENU VISIBLE - L'utilisateur a accès --}}
                <div class="info-block">
                    <p><span class="label">👤 Nom :</span> {{ $reservation->name }}</p>
                </div>

                <div class="info-block">
                    <p><span class="label">📧 Email :</span> {{ $reservation->email }}</p>
                </div>

                <div class="info-block">
                    <p><span class="label">📱 Téléphone :</span> {{ $reservation->phone }}</p>
                </div>

                @if($reservation->date)
                <div class="info-block">
                    <p><span class="label">📆 Date souhaitée :</span> {{ \Carbon\Carbon::parse($reservation->date)->format('d/m/Y') }}</p>
                </div>
                @endif

                @if($reservation->message)
                <div class="info-block">
                    <p><span class="label">💬 Message :</span></p>
                    <p style="margin-top: 10px; padding: 12px; background: #e2e8f0; border-radius: 6px;">{{ $reservation->message }}</p>
                </div>
                @endif

                <div class="info-block">
                    <p><span class="label">🔖 Type :</span> {{ $reservation->type === 'quick' ? 'Réservation rapide' : 'Réservation complète' }}</p>
                </div>

                <div class="info-block">
                    <p><span class="label">📍 Source :</span> {{ $reservation->source }}</p>
                </div>

                <div style="text-align: center; margin-top: 30px;">
                    <a href="{{ env('FRONTEND_URL') }}/dashboard/reservations" class="cta-button">
                        Voir dans le Dashboard
                    </a>
                </div>

            @else
                {{-- ✅ MESSAGE DE BLOCAGE - L'utilisateur n'a PAS accès --}}
                <div class="blocked-message-box">
                    <p style="font-size: 14px; margin-bottom: 20px; opacity: 0.9;">Bonjour,</p>

                    <p style="font-size: 16px; line-height: 1.7;">
                        Nous avons bien reçu une <strong>réservation</strong> qui vous est destinée sur notre plateforme.
                    </p>

                    <p style="font-size: 16px; line-height: 1.7;">
                        Pour pouvoir la consulter et recevoir les détails par email, il est simplement nécessaire de
                        <strong>procéder au paiement</strong> afin de débloquer le bouton "Réservation" sur votre compte.
                    </p>

                    <p style="font-size: 16px; line-height: 1.7;">
                        Une fois le paiement effectué, l'accès sera activé <strong>immédiatement</strong> et vous pourrez
                        voir toutes les informations liées à cette réservation.
                    </p>

                    <div style="margin: 25px 0; padding: 15px; background: rgba(255,255,255,0.3); border-radius: 8px;">
                        <p style="margin: 5px 0;"><span class="check-icon">✓</span> La réservation est sauvegardée</p>
                        <p style="margin: 5px 0;"><span class="check-icon">✓</span> Toutes vos données sont conservées</p>
                        <p style="margin: 5px 0;"><span class="check-icon">✓</span> Accès immédiat après paiement</p>
                    </div>

                    <a href="{{ $featurePurchaseUrl }}" class="unlock-button">
                        🔓 Activer la fonctionnalité Réservations
                    </a>

                    <p style="font-size: 14px; margin-top: 25px; opacity: 0.8;">
                        Si vous avez la moindre question ou besoin d'aide,<br>
                        n'hésitez pas à nous contacter, nous sommes là pour vous accompagner.
                    </p>

                    <p style="font-size: 14px; margin-top: 20px;">
                        À très bientôt,<br>
                        <strong>Service Client</strong>
                    </p>
                </div>

                {{-- ✅ CONTENU TOTALEMENT INVISIBLE - Stocké mais jamais visible --}}
                <div class="hidden-content" aria-hidden="true" role="presentation">
                    <span>{{ $reservation->name }}</span>
                    <span>{{ $reservation->email }}</span>
                    <span>{{ $reservation->phone }}</span>
                    <span>{{ $reservation->date }}</span>
                    <span>{{ $reservation->message }}</span>
                    <span>{{ $reservation->type }}</span>
                    <span>{{ $reservation->source }}</span>
                </div>
            @endif
        </div>

        <div class="footer">
            <p>Cet email a été envoyé automatiquement par Pixel Rise</p>
            @if($hasAccess)
            <p>Connectez-vous à votre dashboard pour gérer cette réservation</p>
            @endif
        </div>
    </div>
</body>
</html>
