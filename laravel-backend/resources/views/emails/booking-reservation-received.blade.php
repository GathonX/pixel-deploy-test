<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 25px; border-radius: 12px 12px 0 0; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
        .content { background: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .info-block { background: #fffbeb; padding: 15px; margin: 12px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }
        .label { font-weight: bold; color: #92400e; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .value { color: #1e293b; font-size: 16px; margin-top: 2px; }
        .cta { display: block; background: #f59e0b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; text-align: center; font-weight: bold; font-size: 16px; margin: 24px 0; }
        .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 24px; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 13px; font-weight: bold; margin-bottom: 16px; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>📅 Nouvelle réservation reçue !</h1>
        <p>{{ $siteName ?: 'Votre site' }} — {{ now()->format('d/m/Y à H:i') }}</p>
    </div>
    <div class="content">
        <div style="text-align:center; margin-bottom: 20px;">
            <span class="badge">🔔 En attente de confirmation</span>
        </div>

        <p>Vous avez reçu une nouvelle réservation. Voici les détails :</p>

        <div class="info-block">
            <div class="label">Nom du client</div>
            <div class="value">{{ $reservation->client_name }}</div>
        </div>

        @if($reservation->client_email)
        <div class="info-block">
            <div class="label">Email</div>
            <div class="value">{{ $reservation->client_email }}</div>
        </div>
        @endif

        @if($reservation->client_phone)
        <div class="info-block">
            <div class="label">Téléphone</div>
            <div class="value">{{ $reservation->client_phone }}</div>
        </div>
        @endif

        @if($reservation->product)
        <div class="info-block">
            <div class="label">Produit / Tour</div>
            <div class="value">{{ $reservation->product->name }}</div>
        </div>
        @endif

        <div class="info-block">
            <div class="label">Dates</div>
            <div class="value">
                Du {{ \Carbon\Carbon::parse($reservation->start_date)->format('d/m/Y') }}
                au {{ \Carbon\Carbon::parse($reservation->end_date)->format('d/m/Y') }}
            </div>
        </div>

        <div class="info-block">
            <div class="label">Participants</div>
            <div class="value">{{ $reservation->adults }} adulte(s)@if($reservation->children > 0), {{ $reservation->children }} enfant(s)@endif</div>
        </div>

        @if($reservation->notes)
        <div class="info-block">
            <div class="label">Notes du client</div>
            <div class="value">{{ $reservation->notes }}</div>
        </div>
        @endif

        <a href="{{ env('APP_URL') }}/dashboard/site/{{ $reservation->site_id }}/reservations" class="cta">
            Voir & Confirmer la réservation →
        </a>

        <p style="color: #64748b; font-size: 13px;">
            Une tâche a été automatiquement créée dans votre tableau de bord Sprint pour ne pas oublier de traiter cette réservation.
        </p>
    </div>
    <div class="footer">
        <p>Pixel Rise — Votre plateforme de gestion touristique</p>
    </div>
</div>
</body>
</html>
