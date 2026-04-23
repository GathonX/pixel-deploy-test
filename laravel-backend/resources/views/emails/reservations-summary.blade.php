<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { margin: 0 0 10px 0; font-size: 28px; }
        .header .emoji { font-size: 48px; margin-bottom: 10px; }
        .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
        .welcome-message { background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; border-radius: 6px; margin-bottom: 30px; }
        .welcome-message h2 { margin: 0 0 10px 0; color: #065f46; }
        .welcome-message p { margin: 0; color: #047857; }

        .stats-box {
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            padding: 25px;
            border-radius: 8px;
            text-align: center;
            margin: 20px 0;
        }
        .stats-box .number {
            font-size: 48px;
            font-weight: bold;
            margin: 10px 0;
        }
        .stats-box .label {
            font-size: 18px;
            opacity: 0.9;
        }

        .reservation-list {
            margin: 20px 0;
        }
        .reservation-item {
            background: #f9fafb;
            border-left: 4px solid #3b82f6;
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
        }
        .reservation-item h3 {
            margin: 0 0 10px 0;
            color: #1e40af;
            font-size: 16px;
        }
        .reservation-item p {
            margin: 5px 0;
            font-size: 14px;
            color: #64748b;
        }
        .reservation-item .detail {
            display: inline-block;
            margin-right: 15px;
        }
        .reservation-item .label {
            font-weight: bold;
            color: #475569;
        }

        .cta-button {
            display: inline-block;
            margin: 30px 0;
            padding: 18px 40px;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            text-align: center;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
            transition: all 0.3s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.5);
        }

        .features-list {
            background: #f9fafb;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        .features-list h3 {
            margin: 0 0 15px 0;
            color: #1e293b;
        }
        .features-list ul {
            margin: 0;
            padding-left: 20px;
        }
        .features-list li {
            margin: 8px 0;
            color: #475569;
        }

        .footer {
            text-align: center;
            margin-top: 30px;
            padding: 20px;
            color: #64748b;
            font-size: 12px;
        }
        .footer p {
            margin: 5px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="emoji">🎉</div>
            <h1>Fonctionnalité Réactivée !</h1>
            <p style="margin: 0; opacity: 0.9;">Vous avez récupéré l'accès à vos réservations masquées</p>
        </div>

        <div class="content">
            <div class="welcome-message">
                <h2>✅ Bienvenue à nouveau !</h2>
                <p>Votre fonctionnalité Réservations est maintenant active. Toutes vos réservations masquées sont désormais accessibles dans votre tableau de bord.</p>
            </div>

            <div class="stats-box">
                <div class="label">Réservations récupérées</div>
                <div class="number">{{ $totalCount }}</div>
                <p style="margin: 0; opacity: 0.9;">
                    {{ $totalCount > 1 ? 'réservations ont été' : 'réservation a été' }} reçue{{ $totalCount > 1 ? 's' : '' }} pendant que la fonctionnalité était inactive
                </p>
            </div>

            <div class="reservation-list">
                <h3 style="color: #1e293b; margin-bottom: 15px;">📋 Aperçu des réservations :</h3>

                @foreach($maskedReservations->take(5) as $reservation)
                <div class="reservation-item">
                    <h3>{{ $reservation->name }}</h3>
                    <p>
                        <span class="detail">
                            <span class="label">📅 Date:</span>
                            {{ \Carbon\Carbon::parse($reservation->date)->format('d/m/Y') }}
                        </span>
                        <span class="detail">
                            <span class="label">🕐 Heure:</span>
                            {{ $reservation->time ? \Carbon\Carbon::parse($reservation->time)->format('H:i') : 'Non précisée' }}
                        </span>
                        <span class="detail">
                            <span class="label">👥 Personnes:</span>
                            {{ $reservation->guests }}
                        </span>
                    </p>
                    <p>
                        <span class="label">📧 Email:</span> {{ $reservation->email }}<br>
                        @if($reservation->phone)
                        <span class="label">📱 Téléphone:</span> {{ $reservation->phone }}
                        @endif
                    </p>
                </div>
                @endforeach

                @if($totalCount > 5)
                <p style="text-align: center; color: #64748b; margin-top: 15px;">
                    ... et {{ $totalCount - 5 }} autre{{ $totalCount - 5 > 1 ? 's' : '' }} réservation{{ $totalCount - 5 > 1 ? 's' : '' }}
                </p>
                @endif
            </div>

            <div style="text-align: center;">
                <a href="{{ $dashboardUrl }}" class="cta-button">
                    🚀 Voir toutes mes réservations
                </a>
            </div>

            <div class="features-list">
                <h3>🎯 Fonctionnalités maintenant disponibles :</h3>
                <ul>
                    <li>✅ Accès illimité à toutes vos réservations</li>
                    <li>✅ Calendrier intégré pour gérer vos disponibilités</li>
                    <li>✅ Rappels automatiques par email</li>
                    <li>✅ Synchronisation en temps réel</li>
                    <li>✅ Statistiques détaillées de vos réservations</li>
                    <li>✅ Export de données</li>
                </ul>
            </div>

            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 6px; margin-top: 20px;">
                <p style="margin: 0; color: #92400e;">
                    <strong>💡 Astuce :</strong> Répondez rapidement à vos clients pour maximiser vos conversions !
                    Vos clients attendent votre confirmation.
                </p>
            </div>
        </div>

        <div class="footer">
            <p><strong>PixelRise</strong> - Système de réservations professionnel</p>
            <p>Ce message a été envoyé automatiquement suite à l'activation de votre fonctionnalité Réservations.</p>
            <p>Besoin d'aide ? Contactez notre support à support@pixel-rise.com</p>
        </div>
    </div>
</body>
</html>
