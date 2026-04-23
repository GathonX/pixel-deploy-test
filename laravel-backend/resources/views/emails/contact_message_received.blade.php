<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Nouveau message de contact</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .container { background-color: #f4f4f4; padding: 20px; border-radius: 5px; }
        .header { background-color: #007bff; color: white; padding: 10px; text-align: center; }
        .content { background-color: white; padding: 20px; border-radius: 5px; margin-top: 10px; }
        .footer { text-align: center; color: #777; margin-top: 20px; font-size: 0.8em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Nouveau Message de Contact</h1>
        </div>
        <div class="content">
            <p><strong>Nom :</strong> {{ $name }}</p>
            <p><strong>Email :</strong> {{ $email }}</p>
            <p><strong>Source :</strong> {{ $source }}</p>
            
            <h3>Message :</h3>
            <p>{{ $message }}</p>
        </div>
        <div class="footer">
            <p>© {{ date('Y') }} PixelRise AI - Tous droits réservés</p>
        </div>
    </div>
</body>
</html>
