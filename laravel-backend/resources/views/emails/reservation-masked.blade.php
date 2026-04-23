<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }

        /* Contenu masqué */
        .masked-overlay {
            position: relative;
            min-height: 300px;
            background: #f9fafb;
            border-radius: 8px;
            padding: 20px;
        }
        .masked-content {
            display: none !important;
            visibility: hidden !important;
        }
        .masked-message {
            background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
            color: white;
            padding: 40px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        .masked-message h2 {
            margin: 0 0 15px 0;
            font-size: 24px;
        }
        .masked-message p {
            margin: 15px 0;
            font-size: 16px;
            line-height: 1.5;
        }
        .unlock-button {
            display: inline-block;
            margin-top: 25px;
            padding: 15px 30px;
            background: white;
            color: #d97706;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
            transition: all 0.3s;
        }
        .unlock-button:hover {
            background: #fef3c7;
            transform: scale(1.05);
        }
        .price-tag {
            background: rgba(255, 255, 255, 0.2);
            padding: 8px 15px;
            border-radius: 20px;
            display: inline-block;
            margin: 10px 0;
            font-size: 18px;
            font-weight: bold;
        }
        .footer { text-align: center; margin-top: 20px; color: #64748b; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 style="margin: 0;">🔒 Nouvelle Réservation Reçue</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Contenu masqué - Fonctionnalité non activée</p>
        </div>

        <div class="content">
            <div class="masked-overlay">
                <!-- Contenu flouté en arrière-plan -->
                <div class="masked-content">
                    <h3>Détails de la réservation</h3>
                    <p><strong>Nom:</strong> ████████████</p>
                    <p><strong>Email:</strong> ████████████████</p>
                    <p><strong>Téléphone:</strong> ████████████</p>
                    <p><strong>Date:</strong> ██/██/████</p>
                    <p><strong>Heure:</strong> ██:██</p>
                    <p><strong>Nombre de personnes:</strong> ██</p>
                    <p><strong>Description:</strong> ████████████████████████████</p>
                </div>

                <!-- Message de déblocage -->
                <div class="masked-message">
                    <h2>🎯 Réservation Reçue !</h2>
                    <p>Vous avez reçu une nouvelle réservation, mais vous devez activer la fonctionnalité <strong>Réservations</strong> pour voir son contenu.</p>

                    <div class="price-tag">5,99€/mois</div>

                    <p style="font-size: 14px; margin-top: 20px;">
                        ✅ Accès illimité aux réservations<br>
                        ✅ Calendrier intégré<br>
                        ✅ Rappels automatiques<br>
                        ✅ Synchronisation temps réel
                    </p>

                    <a href="{{ $featurePurchaseUrl }}" class="unlock-button">
                        🚀 Débloquer maintenant
                    </a>

                    <p style="font-size: 13px; margin-top: 20px; opacity: 0.8;">
                        Vos réservations sont sauvegardées et seront visibles<br>dès l'activation de la fonctionnalité
                    </p>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>PixelRise - Système de réservations professionnel</p>
            <p>Ce message a été envoyé automatiquement. Ne pas répondre.</p>
        </div>
    </div>
</body>
</html>
