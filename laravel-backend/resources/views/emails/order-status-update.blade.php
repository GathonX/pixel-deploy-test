
{{-- ===== TEMPLATE 2: order-status-update.blade.php ===== --}}
{{-- Fichier: resources/views/emails/order-status-update.blade.php --}}

<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mise à jour de commande</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: {{ $statusColor }}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
        .status-update { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {{ $statusColor }}; }
        .order-summary { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
        .status-badge { background: {{ $statusColor }}; color: white; padding: 6px 12px; border-radius: 20px; font-weight: bold; }
        .timeline { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .timeline-item { display: flex; align-items: center; margin: 10px 0; }
        .timeline-dot { width: 12px; height: 12px; border-radius: 50%; margin-right: 15px; }
        .timeline-active { background: {{ $statusColor }}; }
        .timeline-completed { background: #10B981; }
        .timeline-pending { background: #E5E7EB; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 Mise à jour de commande</h1>
            <p>Commande #{{ $order->order_number }}</p>
        </div>

        <div class="content">
            <p>Bonjour <strong>{{ $customer->full_name }}</strong>,</p>

            <div class="status-update">
                <h3>🔄 Nouveau statut de votre commande</h3>
                <p>Le statut de votre commande <strong>#{{ $order->order_number }}</strong> a été mis à jour :</p>
                
                <div style="text-align: center; margin: 20px 0;">
                    <span class="status-badge">{{ $statusLabel }}</span>
                </div>

                @if($order->status_reason)
                    <p><strong>Informations :</strong> {{ $order->status_reason }}</p>
                @endif

                <p><strong>Date de mise à jour :</strong> {{ $order->status_updated_at->format('d/m/Y à H:i') }}</p>
            </div>

            @if($newStatus === 'confirmed')
                <div style="background: #EBF8FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>🎉 Votre commande est confirmée !</h3>
                    <p>Excellente nouvelle ! Nous avons confirmé votre commande et nous commençons sa préparation.</p>
                    <p><strong>Prochaine étape :</strong> Préparation et expédition sous 24-48h</p>
                </div>
            @elseif($newStatus === 'shipped')
                <div style="background: #F3E8FF; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>🚚 Votre commande est expédiée !</h3>
                    <p>Votre commande est en route ! Vous devriez la recevoir dans les prochains jours.</p>
                    <p><strong>Livraison estimée :</strong> 2-3 jours ouvrés</p>
                </div>
            @elseif($newStatus === 'completed')
                <div style="background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>✅ Commande finalisée !</h3>
                    <p>Parfait ! Votre commande a été traitée avec succès.</p>
                    <p>Nous espérons que vous êtes satisfait(e) de votre achat. N'hésitez pas à nous faire part de vos commentaires !</p>
                </div>
            @elseif($newStatus === 'cancelled')
                <div style="background: #FEF2F2; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3>❌ Commande annulée</h3>
                    <p>Votre commande a été annulée. Si ce n'était pas voulu, contactez-nous rapidement.</p>
                    <p>Tout remboursement éventuel sera traité dans les 3-5 jours ouvrés.</p>
                </div>
            @endif

            <div class="timeline">
                <h3>📋 Suivi de commande</h3>
                <div class="timeline-item">
                    <div class="timeline-dot timeline-completed"></div>
                    <div>
                        <strong>Commande passée</strong><br>
                        <small>{{ $order->created_at->format('d/m/Y à H:i') }}</small>
                    </div>
                </div>
                
                <div class="timeline-item">
                    <div class="timeline-dot {{ in_array($newStatus, ['confirmed', 'shipped', 'completed']) ? 'timeline-completed' : ($newStatus === 'pending' ? 'timeline-active' : 'timeline-pending') }}"></div>
                    <div>
                        <strong>Confirmation</strong><br>
                        <small>{{ in_array($newStatus, ['confirmed', 'shipped', 'completed']) ? 'Confirmée' : 'En attente' }}</small>
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-dot {{ in_array($newStatus, ['shipped', 'completed']) ? 'timeline-completed' : ($newStatus === 'confirmed' ? 'timeline-active' : 'timeline-pending') }}"></div>
                    <div>
                        <strong>Expédition</strong><br>
                        <small>{{ in_array($newStatus, ['shipped', 'completed']) ? 'Expédiée' : 'En attente' }}</small>
                    </div>
                </div>

                <div class="timeline-item">
                    <div class="timeline-dot {{ $newStatus === 'completed' ? 'timeline-completed' : ($newStatus === 'shipped' ? 'timeline-active' : 'timeline-pending') }}"></div>
                    <div>
                        <strong>Livraison</strong><br>
                        <small>{{ $newStatus === 'completed' ? 'Livrée' : 'En attente' }}</small>
                    </div>
                </div>
            </div>

            <div class="order-summary">
                <h3>📦 Résumé de commande</h3>
                <p><strong>Numéro :</strong> {{ $order->order_number }}</p>
                <p><strong>Total :</strong> {{ number_format($order->total_amount, 2, ',', ' ') }}€</p>
                <p><strong>Articles :</strong> {{ $order->total_items }} article(s)</p>
                <p><strong>Méthode de paiement :</strong> {{ ucfirst($order->payment_method) }}</p>
            </div>

            <div style="text-align: center; margin: 30px 0;">
                <p>Des questions sur votre commande ?</p>
                <a href="mailto:{{ $seller->email }}" style="background: {{ $statusColor }}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                    📧 Nous contacter
                </a>
            </div>

            <div class="footer">
                <p>Cette notification a été envoyée par {{ $companyName }}.</p>
                <p>Pour toute question : {{ $seller->email }}</p>
                <p><small>Email automatique - Ne pas répondre directement</small></p>
            </div>
        </div>
    </div>
</body>
</html>