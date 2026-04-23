<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Nouvelle demande de domaine</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #1e40af 0%, #0891b2 100%); padding: 32px 30px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 700; }
        .header .domain { font-size: 28px; font-weight: 800; color: #fbbf24; margin: 8px 0 0; }
        .body { padding: 30px; }
        .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; }
        .info-grid { display: grid; gap: 12px; margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 8px; font-size: 14px; }
        .info-row .label { color: #64748b; font-weight: 500; }
        .info-row .value { color: #1e293b; font-weight: 600; }
        .btn { display: inline-block; background: #1e40af; color: #fff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-top: 8px; }
        .footer { text-align: center; padding: 20px; background: #f8fafc; color: #94a3b8; font-size: 12px; }
        .description-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 14px; color: #475569; margin-bottom: 24px; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>🌐 Nouvelle demande de domaine</h1>
        <div class="domain">{{ $studioRequest->domain }}</div>
    </div>
    <div class="body">
        <div class="alert">
            ⚡ Action requise — Une nouvelle demande d'enregistrement de domaine a été soumise et nécessite votre traitement.
        </div>

        <div class="info-grid">
            <div class="info-row">
                <span class="label">Domaine demandé</span>
                <span class="value">{{ $studioRequest->domain }}</span>
            </div>
            <div class="info-row">
                <span class="label">Client</span>
                <span class="value">{{ $studioRequest->client_name }}</span>
            </div>
            <div class="info-row">
                <span class="label">Email client</span>
                <span class="value">{{ $studioRequest->client_email }}</span>
            </div>
            @if($studioRequest->client_phone)
            <div class="info-row">
                <span class="label">Téléphone</span>
                <span class="value">{{ $studioRequest->client_phone }}</span>
            </div>
            @endif
            @if($studioRequest->company_name)
            <div class="info-row">
                <span class="label">Entreprise</span>
                <span class="value">{{ $studioRequest->company_name }}</span>
            </div>
            @endif
            <div class="info-row">
                <span class="label">Référence</span>
                <span class="value">#STUDIO-{{ $studioRequest->id }}</span>
            </div>
            <div class="info-row">
                <span class="label">Date de demande</span>
                <span class="value">{{ $studioRequest->created_at->format('d/m/Y à H:i') }}</span>
            </div>
        </div>

        @if($studioRequest->description)
        <p style="font-size:14px; font-weight:600; margin-bottom:6px; color:#374151;">Message du client :</p>
        <div class="description-box">{{ $studioRequest->description }}</div>
        @endif

        <div style="text-align:center; margin-top: 24px;">
            <a href="{{ config('app.frontend_url') }}/admin/studio-domaine" class="btn">
                Gérer la demande →
            </a>
        </div>
    </div>
    <div class="footer">
        Studio Domaine — PixelRise &bull; Cet email est envoyé automatiquement, ne pas répondre directement.
    </div>
</div>
</body>
</html>
