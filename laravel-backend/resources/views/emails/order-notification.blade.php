{{-- resources/views/emails/order-notification.blade.php --}}
{{-- Email envoyé au PROPRIÉTAIRE du funnel pour notifier une nouvelle commande --}}

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nouvelle commande #{{{ $order->order_number }}}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f8fafc;
        }
        .container {
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 24px;
        }
        .header .amount {
            font-size: 32px;
            font-weight: bold;
            margin: 10px 0;
        }
        .content {
            padding: 30px;
        }
        .order-info {
            background: #f1f5f9;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
        }
        .customer-info {
            background: #ecfdf5;
            border-left: 4px solid #10b981;
            padding: 15px;
            margin: 20px 0;
        }
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .items-table th,
        .items-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
        }
        .items-table th {
            background: #f8fafc;
            font-weight: 600;
        }
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            color: white;
            background-color: {{ $statusColor }};
        }
        .actions {
            text-align: center;
            margin: 30px 0;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #3b82f6;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 600;
            margin: 0 10px;
        }
        .btn-success {
            background: #10b981;
        }
        .footer {
            background: #f8fafc;
            padding: 20px;
            text-align: center;
            color: #6b7280;
            font-size: 14px;
        }
        .highlight {
            background: #fef3c7;
            padding: 2px 6px;
            border-radius: 4px;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🎉 Nouvelle commande reçue !</h1>
            <div class="amount">{{ number_format($order->total_amount, 2) }}€</div>
            <p>Commande #{{ $order->order_number }}</p>
        </div>

        <!-- Content -->
        <div class="content">
            <p>Salut <strong>{{ $seller->name }}</strong> !,</p>
            
            <p>Excellente nouvelle ! Vous venez de recevoir une <span class="highlight">nouvelle commande</span> sur votre funnel de vente.</p>

            <!-- Order Information -->
            <div class="order-info">
                <h3>📋 Informations de la commande</h3>
                <p><strong>Numéro :</strong> {{ $order->order_number }}</p>
                <p><strong>Date :</strong> {{ $order->created_at->format('d/m/Y à H:i') }}</p>
                <p><strong>Statut :</strong> <span class="status-badge">{{ $statusLabel }}</span></p>
                <p><strong>Méthode de paiement :</strong> {{ $paymentMethodLabel }}</p>
                <p><strong>Funnel ID :</strong> #{{ $order->funnel_id }}</p>
                @if($order->notes)
                <p><strong>Notes client :</strong> {{ $order->notes }}</p>
                @endif
            </div>

            <!-- Customer Information -->
            <div class="customer-info">
                <h3>👤 Informations client</h3>
                <p><strong>Nom :</strong> {{ $customerFullName }}</p>
                <p><strong>Email :</strong> <a href="mailto:{{ $customer->email }}">{{ $customer->email }}</a></p>
                <p><strong>Téléphone :</strong> <a href="tel:{{ $customer->phone }}">{{ $customer->phone }}</a></p>
                <p><strong>Adresse :</strong> {{ $customer->address }}, {{ $customer->city }} {{ $customer->postal_code }}, {{ $customer->country }}</p>
            </div>

            <!-- Order Items -->
            @if($items->count() > 0)
            <h3>🛍️ Produits commandés</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Produit</th>
                        <th>Quantité</th>
                        <th>Prix unitaire</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($items as $item)
                    <tr>
                        <td>{{ $item->product_name }}</td>
                        <td>{{ $item->quantity }}</td>
                        <td>{{ number_format($item->unit_price, 2) }}€</td>
                        <td><strong>{{ number_format($item->total_price, 2) }}€</strong></td>
                    </tr>
                    @endforeach
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background: #f1f5f9;">
                        <td colspan="3">Total de la commande</td>
                        <td style="color: #10b981; font-size: 18px;">{{ number_format($order->total_amount, 2) }}€</td>
                    </tr>
                </tfoot>
            </table>
            @endif

            <!-- Actions -->
            <div class="actions">
                <a href="{{ config('app.frontend_url') }}/funnel-crm/orders/{{ $order->id }}" class="btn">
                    📋 Voir la commande
                </a>
                <a href="{{ config('app.frontend_url') }}/funnel-crm/customers" class="btn btn-success">
                    👥 Gérer les clients
                </a>
            </div>

            <!-- Next Steps -->
            <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <h4>📝 Prochaines étapes recommandées :</h4>
                <ul>
                    <li>✅ <strong>Confirmer la commande</strong> si le paiement est validé</li>
                    <li>📧 <strong>Contacter le client</strong> pour l'accueil et l'onboarding</li>
                    <li>📦 <strong>Préparer la livraison</strong> des produits/accès</li>
                    <li>📊 <strong>Mettre à jour le CRM</strong> avec les informations client</li>
                </ul>
            </div>

            <p>Félicitations pour cette nouvelle vente ! 🎊</p>
            
            <p>Cordialement,<br>
            L'équipe {{ $companyName }}</p>
        </div>

        <!-- Footer -->
        <div class="footer">
            <p>Cet email a été envoyé automatiquement par votre système de funnel {{ $companyName }}.</p>
            <p>Pour toute question, contactez le support : 
                <a href="mailto:{{ config('mail.from.address') }}">{{ config('mail.from.address') }}</a>
            </p>
        </div>
    </div>
</body>
</html>