<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Demande de domaine - Informations requises</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 32px 30px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 700; }
        .header .domain { font-size: 24px; font-weight: 700; color: #fecaca; margin: 8px 0 0; }
        .body { padding: 30px; }
        .reason-box { background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #7f1d1d; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 8px; font-size: 14px; margin-bottom: 8px; }
        .info-row .label { color: #64748b; font-weight: 500; }
        .info-row .value { color: #1e293b; font-weight: 600; }
        .btn { display: inline-block; background: #1e40af; color: #fff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { text-align: center; padding: 20px; background: #f8fafc; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>❌ Demande non aboutie</h1>
        <div class="domain">{{ $studioRequest->domain }}</div>
    </div>
    <div class="body">
        <p style="font-size:15px; color:#374151; margin-bottom:20px;">
            Bonjour <strong>{{ $studioRequest->client_name }}</strong>,
        </p>
        <p style="font-size:14px; color:#64748b; margin-bottom:20px; line-height:1.7;">
            Après examen de votre demande d'enregistrement pour <strong>{{ $studioRequest->domain }}</strong>,
            nous ne sommes pas en mesure de la traiter pour le moment.
        </p>

        @if($studioRequest->rejection_reason)
        <p style="font-size:14px; font-weight:600; margin-bottom:6px; color:#374151;">Motif :</p>
        <div class="reason-box">
            {{ $studioRequest->rejection_reason }}
        </div>
        @endif

        <div class="info-row" style="margin-bottom:20px;">
            <span class="label">Référence demande</span>
            <span class="value">#STUDIO-{{ $studioRequest->id }}</span>
        </div>

        <p style="font-size:13px; color:#64748b; line-height:1.7; margin-bottom:24px;">
            Vous pouvez nous contacter via le support pour plus d'informations ou pour soumettre une nouvelle demande
            avec un autre nom de domaine.
        </p>

        <div style="text-align:center;">
            <a href="{{ config('app.frontend_url') }}/studio-domaine/search" class="btn">
                Rechercher un autre domaine →
            </a>
        </div>
    </div>
    <div class="footer">
        Studio Domaine — PixelRise &bull; Pour toute question, ouvrez un ticket de support.
    </div>
</div>
</body>
</html>
