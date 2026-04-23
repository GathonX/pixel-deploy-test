{{-- ===== TEMPLATE 1: order-confirmation.blade.php ===== --}}
{{-- Fichier: resources/views/emails/order-confirmation.blade.php --}}

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmation de commande</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .order-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .item { border-bottom: 1px solid #eee; padding: 15px 0; }
        .item:last-child { border-bottom: none; }
        .total { font-size: 1.2em; font-weight: bold; color: #10B981; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        .button { background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Commande Confirmée</h1>
            <p>Merci pour votre confiance, {{ $customer->first_name }} !</p>
        </div>

        <div class="content">
            <p>Bonjour <strong>{{ $customer->full_name }}</strong>,</p>
            
            <p>Nous avons bien reçu votre commande <strong>#{{ $order->order_number }}</strong> 
            et nous vous en remercions !</p>

            <div class="order-info">
                <h3>📋 Détails de votre commande</h3>
                <p><strong>Numéro :</strong> {{ $order->order_number }}</p>
                <p><strong>Date :</strong> {{ $order->created_at->format('d/m/Y à H:i') }}</p>
                <p><strong>Statut :</strong> {{ $order->status_label }}</p>
                @if($order->notes)
                    <p><strong>Notes :</strong> {{ $order->notes }}</p>
                @endif
            </div>

            <div class="order-info">
                <h3>🛍️ Articles commandés</h3>
                @foreach($items as $item)
                    <div class="item">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>{{ $item->product_name }}</strong><br>
                                <small>Quantité: {{ $item->quantity }} × {{ number_format($item->unit_price, 2, ',', ' ') }}€</small>
                            </div>
                            <div class="total">
                                {{ number_format($item->total_price, 2, ',', ' ') }}€
                            </div>
                        </div>
                    </div>
                @endforeach
                
                <div style="text-align: right; margin-top: 20px; font-size: 1.3em;">
                    <strong>Total: {{ number_format($order->total_amount, 2, ',', ' ') }}€</strong>
                </div>
            </div>

            <div class="order-info">
                <h3>📦 Informations de livraison</h3>
                <p>
                    <strong>{{ $customer->full_name }}</strong><br>
                    {{ $customer->address }}<br>
                    {{ $customer->postal_code }} {{ $customer->city }}<br>
                    {{ $customer->country }}
                </p>
                <p><strong>Email :</strong> {{ $customer->email }}</p>
                @if($customer->phone)
                    <p><strong>Téléphone :</strong> {{ $customer->phone }}</p>
                @endif
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p><strong>🎉 Que se passe-t-il maintenant ?</strong></p>
                <ul style="text-align: left; max-width: 400px; margin: 0 auto;">
                    <li>Nous préparons votre commande</li>
                    <li>Vous recevrez un email de confirmation d'expédition</li>
                    <li>Votre commande sera livrée sous 3-5 jours ouvrés</li>
                </ul>
            </div>

            <div style="text-align: center;">
                <a href="mailto:{{ $seller->email }}" class="button">
                    📧 Nous contacter
                </a>
            </div>

            <div class="footer">
                <p>Cette commande a été créée via {{ $companyName }}.</p>
                <p>En cas de question, n'hésitez pas à nous contacter à {{ $seller->email }}</p>
                <p><small>Email automatique - Ne pas répondre directement</small></p>
            </div>
        </div>
    </div>
</body>
</html>

