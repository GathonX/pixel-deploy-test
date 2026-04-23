<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Votre domaine est activé</title>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 32px 30px; text-align: center; }
        .header h1 { margin: 0; color: #fff; font-size: 22px; font-weight: 700; }
        .header .domain { font-size: 28px; font-weight: 800; color: #d1fae5; margin: 8px 0 0; }
        .body { padding: 30px; }
        .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 14px 16px; border-radius: 8px; margin-bottom: 24px; font-size: 14px; color: #065f46; }
        .info-grid { display: grid; gap: 12px; margin-bottom: 24px; }
        .info-row { display: flex; justify-content: space-between; padding: 10px 14px; background: #f8fafc; border-radius: 8px; font-size: 14px; }
        .info-row .label { color: #64748b; font-weight: 500; }
        .info-row .value { color: #1e293b; font-weight: 600; }
        .btn { display: inline-block; background: #059669; color: #fff; text-decoration: none; padding: 13px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; }
        .footer { text-align: center; padding: 20px; background: #f8fafc; color: #94a3b8; font-size: 12px; }
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>✅ Votre domaine est activé !</h1>
        <div class="domain">{{ $studioRequest->domain }}</div>
    </div>
    <div class="body">
        <div class="success-box">
            🎉 Bonne nouvelle ! Votre demande d'enregistrement de domaine a été validée et traitée avec succès par notre équipe.
        </div>

        <p style="font-size:15px; color:#374151; margin-bottom:20px;">
            Bonjour <strong>{{ $studioRequest->client_name }}</strong>,
        </p>
        <p style="font-size:14px; color:#64748b; margin-bottom:24px; line-height:1.7;">
            Nous avons le plaisir de vous confirmer que votre nom de domaine <strong>{{ $studioRequest->domain }}</strong>
            a été enregistré et activé avec succès. Vous pouvez dès maintenant l'utiliser pour votre projet.
        </p>

        <div class="info-grid">
            <div class="info-row">
                <span class="label">Domaine activé</span>
                <span class="value">{{ $studioRequest->domain }}</span>
            </div>
            <div class="info-row">
                <span class="label">Référence</span>
                <span class="value">#STUDIO-{{ $studioRequest->id }}</span>
            </div>
            <div class="info-row">
                <span class="label">Date d'activation</span>
                <span class="value">{{ $studioRequest->activated_at ? $studioRequest->activated_at->format('d/m/Y à H:i') : now()->format('d/m/Y à H:i') }}</span>
            </div>
        </div>

        <p style="font-size:13px; color:#64748b; line-height:1.7; margin-bottom:24px;">
            Notre équipe va vous contacter prochainement avec les informations de configuration de votre domaine
            (accès DNS, redirections, etc.). Si vous avez des questions, n'hésitez pas à ouvrir un ticket de support.
        </p>

        <div style="text-align:center;">
            <a href="{{ config('app.frontend_url') }}/studio-domaine" class="btn">
                Voir mon espace domaine →
            </a>
        </div>
    </div>
    <div class="footer">
        Studio Domaine — PixelRise &bull; Merci pour votre confiance.
    </div>
</div>
</body>
</html>
