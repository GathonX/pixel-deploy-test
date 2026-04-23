<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation PixelRise</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
        .container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 40px 32px; text-align: center; }
        .header h1 { color: #ffffff; font-size: 22px; font-weight: 700; margin: 0; }
        .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin: 8px 0 0; }
        .body { padding: 32px; }
        .body p { color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 16px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
        .info-box .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 4px; }
        .info-box .value { font-size: 15px; font-weight: 600; color: #1f2937; }
        .btn { display: block; width: fit-content; margin: 28px auto 8px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 8px; font-size: 15px; font-weight: 600; text-align: center; }
        .note { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 12px; }
        .footer { background: #f8fafc; padding: 20px 32px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { font-size: 12px; color: #9ca3af; margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Vous êtes invité !</h1>
            <p>PixelRise — Plateforme professionnelle</p>
        </div>

        <div class="body">
            <p>Bonjour <strong>{{ $invitation->name }}</strong>,</p>

            <p><strong>{{ $inviterName }}</strong> vous invite à rejoindre son espace de travail sur PixelRise avec le rôle <strong>{{ $roleLabel }}</strong>.</p>

            <div class="info-box">
                <div class="label">Workspace</div>
                <div class="value">{{ $workspaceName }}</div>
                @if($siteName)
                <div style="margin-top:12px">
                    <div class="label">Site attribué</div>
                    <div class="value">{{ $siteName }}</div>
                </div>
                @endif
                <div style="margin-top:12px">
                    <div class="label">Rôle</div>
                    <div class="value">{{ $roleLabel }}</div>
                </div>
            </div>

            <p>Cliquez sur le bouton ci-dessous pour créer votre mot de passe et accéder à votre espace :</p>

            <a href="{{ $acceptUrl }}" class="btn">Accepter l'invitation</a>

            <p class="note">Ce lien expire dans 7 jours. Si vous n'êtes pas concerné par cette invitation, ignorez simplement cet email.</p>
        </div>

        <div class="footer">
            <p>© {{ date('Y') }} PixelRise — Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
