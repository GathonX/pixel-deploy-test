<!DOCTYPE html>
<html>
<head>
    <title>Facture #{{ $invoice->invoice_number }}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .invoice-container { max-width: 800px; margin: 0 auto; padding: 20px; }
        .invoice-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            margin-bottom: 30px; 
            border-bottom: 2px solid #007bff;
            padding-bottom: 15px;
        }
        .company-logo img { 
            max-width: 200px; 
            max-height: 100px; 
        }
        .company-info { text-align: right; }
        .invoice-details { margin-bottom: 30px; }
        .invoice-items { width: 100%; border-collapse: collapse; }
        .invoice-items th, .invoice-items td { border: 1px solid #ddd; padding: 10px; text-align: left; }
        .invoice-total { text-align: right; margin-top: 20px; }
        .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #777; }
        .payment-instructions { 
            background-color: #f4f4f4; 
            padding: 15px; 
            border-radius: 5px; 
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="invoice-container">
        <div class="invoice-header">
            <div class="company-logo">
                <img src="{{ public_path('images/pixel-logo.png') }}" alt="PixelRise Logo">
            </div>
            <div class="company-info">
                <strong>{{ $company['name'] }}</strong><br>
                {{ $company['address'] }}<br>
                {{ $company['city'] }}, {{ $company['country'] }}<br>
                TVA: {{ $company['vat_number'] }}
            </div>
        </div>

        <div class="invoice-details">
            <h1>Facture #{{ $invoice->invoice_number }}</h1>
            <p>
                <strong>Date de facturation :</strong> {{ $invoice->created_at->format('d/m/Y') }}<br>
                <strong>Date d'échéance :</strong> {{ $invoice->due_date->format('d/m/Y') }}
            </p>
            <p>
                <strong>Facturé à :</strong><br>
                {{ $invoice->user->name }}<br>
                {{ $invoice->user->email }}
            </p>
        </div>

        <table class="invoice-items">
            <thead>
                <tr>
                    <th>Description</th>
                    <th>Période</th>
                    <th>Montant HT</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>{{ $invoice->feature->name }}</td>
                    <td>{{ $invoice->billing_period === 'yearly' ? 'Annuel' : 'Mensuel' }}</td>
                    <td>{{ $tax_details['base_amount'] }} €</td>
                </tr>
            </tbody>
        </table>

        <div class="invoice-total">
            <table style="width: 100%; margin-top: 20px;">
                <tr>
                    <td style="text-align: right; width: 70%;">
                        <strong>Montant HT :</strong>
                    </td>
                    <td style="text-align: right; width: 30%;">
                        {{ $tax_details['base_amount'] }} €
                    </td>
                </tr>
                <tr>
                    <td style="text-align: right;">
                        <strong>TVA ({{ $tax_details['tax_rate'] }}) :</strong>
                    </td>
                    <td style="text-align: right;">
                        {{ $tax_details['tax_amount'] }} €
                    </td>
                </tr>
                <tr style="border-top: 2px solid #007bff;">
                    <td style="text-align: right; font-size: 1.2em; font-weight: bold;">
                        Total TTC :
                    </td>
                    <td style="text-align: right; font-size: 1.2em; font-weight: bold; color: #007bff;">
                        {{ $tax_details['total_amount'] }} €
                    </td>
                </tr>
            </table>
        </div>

        <div class="payment-instructions">
            <h3>Instructions de Paiement</h3>
            <p><strong>Statut :</strong> {{ $payment_instructions['status'] }}</p>
            <p><strong>Date d'échéance :</strong> {{ $payment_instructions['due_date'] }}</p>
            <p><strong>Référence de Paiement :</strong> {{ $payment_instructions['payment_reference'] }}</p>
            
            <h4>Modes de Paiement Disponibles :</h4>
            <ul>
                @foreach($payment_instructions['payment_methods'] as $method => $label)
                    <li>{{ $label }}</li>
                @endforeach
            </ul>

            <div class="next-steps">
                <p>Étapes suivantes :</p>
                <ol>
                    <li>Choisissez un mode de paiement parmi les options ci-dessus</li>
                    <li>Effectuez le paiement en utilisant la référence : {{ $payment_instructions['payment_reference'] }}</li>
                    <li>
                        <a href="{{ $payment_instructions['next_step_url'] }}" style="color: blue; text-decoration: underline;">
                            Cliquez ici pour soumettre vos détails de paiement
                        </a>
                    </li>
                </ol>
                
                <div class="payment-link" style="margin-top: 15px; text-align: center;">
                    <p>Retour à la section client :</p>
                    <a href="{{ $payment_instructions['next_step_url'] }}" style="
                        display: inline-block;
                        padding: 10px 20px;
                        background-color: #007bff;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        font-weight: bold;
                    ">
                        Aller à la page de paiement
                    </a>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>Merci de votre confiance. Tout règlement après la date d'échéance sera majoré de pénalités de retard.</p>
            <p>{{ $company['name'] }} - {{ $company['registration'] }}</p>
        </div>
    </div>
</body>
</html>
