<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f9fafb;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px 20px;
            border-radius: 12px 12px 0 0;
            text-align: center;
        }
        .header h1 {
            margin: 0 0 10px 0;
            font-size: 28px;
        }
        .header p {
            margin: 5px 0 0 0;
            opacity: 0.95;
            font-size: 16px;
        }
        .content {
            background: white;
            padding: 30px;
            border-radius: 0 0 12px 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .celebration-icon {
            font-size: 48px;
            text-align: center;
            margin-bottom: 20px;
        }
        .stats-box {
            background: linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%);
            border-left: 4px solid #0284c7;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            text-align: center;
        }
        .stats-box .number {
            font-size: 36px;
            font-weight: bold;
            color: #0284c7;
            margin: 0;
        }
        .stats-box .label {
            font-size: 14px;
            color: #0369a1;
            margin: 5px 0 0 0;
        }
        .info-section {
            margin: 25px 0;
        }
        .info-section h3 {
            color: #1e40af;
            margin: 0 0 15px 0;
            font-size: 18px;
        }
        .reservation-item {
            background: #f8fafc;
            border-left: 3px solid #3b82f6;
            padding: 15px;
            margin: 10px 0;
            border-radius: 6px;
        }
        .reservation-item .name {
            font-weight: bold;
            color: #1e293b;
            font-size: 16px;
            margin-bottom: 5px;
        }
        .reservation-item .details {
            color: #64748b;
            font-size: 14px;
        }
        .reservation-item .date {
            color: #3b82f6;
            font-weight: 600;
        }
        .cta-button {
            display: block;
            background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
            color: white !important;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 8px;
            font-weight: bold;
            font-size: 18px;
            text-align: center;
            margin: 30px auto;
            max-width: 320px;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            transition: all 0.3s;
        }
        .cta-button:hover {
            background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%);
            box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
        }
        .benefits-list {
            background: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
        }
        .benefits-list ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .benefits-list li {
            color: #92400e;
            margin: 8px 0;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
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
            <div class="celebration-icon">🎉</div>
            <h1>Fonctionnalité Réactivée !</h1>
            <p>Vos réservations sont maintenant accessibles</p>
        </div>

        <div class="content">
            <!-- Statistiques -->
            <div class="stats-box">
                <p class="number">{{ $reservationCount }}</p>
                <p class="label">{{ $reservationCount > 1 ? 'Réservations débloquées' : 'Réservation débloquée' }}</p>
            </div>

            <!-- Message de bienvenue -->
            <div class="info-section">
                <p style="font-size: 16px; color: #1e293b;">
                    Bonjour <strong>{{ $user->first_name ?? $user->name }}</strong>,
                </p>
                <p style="color: #64748b;">
                    Excellente nouvelle ! Votre fonctionnalité <strong>Réservations</strong> a été réactivée avec succès.
                    Vous pouvez maintenant accéder à toutes les réservations qui avaient été masquées pendant la période d'expiration.
                </p>
            </div>

            <!-- Liste des réservations débloquées -->
            <div class="info-section">
                <h3>📋 Réservations débloquées</h3>
                @foreach($blockedReservations as $reservation)
                    <div class="reservation-item">
                        <div class="name">👤 {{ $reservation->name }}</div>
                        <div class="details">
                            📧 {{ $reservation->email }}
                            @if($reservation->phone)
                                <br>📱 {{ $reservation->phone }}
                            @endif
                            @if($reservation->date)
                                <br><span class="date">📆 {{ \Carbon\Carbon::parse($reservation->date)->format('d/m/Y') }}</span>
                            @endif
                            @if($reservation->time)
                                à {{ \Carbon\Carbon::parse($reservation->time)->format('H:i') }}
                            @endif
                        </div>
                    </div>
                @endforeach
            </div>

            <!-- Ce que vous pouvez faire maintenant -->
            <div class="benefits-list">
                <strong style="color: #92400e;">✅ Ce que vous pouvez faire maintenant :</strong>
                <ul>
                    <li>Consulter toutes les réservations dans votre dashboard</li>
                    <li>Gérer et confirmer les demandes de vos clients</li>
                    <li>Accéder à l'historique complet de vos réservations</li>
                    <li>Recevoir les nouveaux emails de réservation sans masquage</li>
                </ul>
            </div>

            <!-- Bouton CTA -->
            <a href="{{ $dashboardUrl }}" class="cta-button">
                📅 Voir mes réservations
            </a>

            <!-- Note importante -->
            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <strong style="color: #0369a1;">💡 Bon à savoir</strong>
                <p style="margin: 10px 0 0 0; color: #0c4a6e; font-size: 14px;">
                    Les nouveaux emails de réservation que vous recevrez à partir de maintenant contiendront
                    toutes les informations complètes sans aucun masquage.
                </p>
            </div>
        </div>

        <div class="footer">
            <p>Cet email a été envoyé automatiquement par Pixel Rise</p>
            <p>Suite à la réactivation de votre fonctionnalité Réservations</p>
        </div>
    </div>
</body>
</html>
