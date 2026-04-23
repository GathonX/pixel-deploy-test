<?php

namespace App\Http\Controllers\API\Booking;

use App\Http\Controllers\Controller;
use App\Models\BookingEmailTemplate;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BookingEmailTemplateController extends Controller
{
    private array $defaultTemplates = [
        'confirmation' => [
            'subject' => 'Confirmation de votre réservation',
            'body_html' => '<p>Bonjour {{client_name}},</p><p>Votre réservation pour <strong>{{product_name}}</strong> du <strong>{{start_date}}</strong> au <strong>{{end_date}}</strong> est confirmée.</p><p>Montant total : <strong>{{total}}</strong></p><p>Merci de votre confiance !</p>',
        ],
        'reminder' => [
            'subject' => 'Rappel de votre réservation',
            'body_html' => '<p>Bonjour {{client_name}},</p><p>Nous vous rappelons votre réservation pour <strong>{{product_name}}</strong> du <strong>{{start_date}}</strong> au <strong>{{end_date}}</strong>.</p><p>À bientôt !</p>',
        ],
        'review' => [
            'subject' => 'Partagez votre avis',
            'body_html' => '<p>Bonjour {{client_name}},</p><p>Nous espérons que votre séjour pour <strong>{{product_name}}</strong> s\'est bien passé.</p><p>N\'hésitez pas à partager votre expérience !</p>',
        ],
    ];

    public function index(Request $request, string $siteId): JsonResponse
    {
        $templates = [];

        foreach (['confirmation', 'reminder', 'review'] as $type) {
            $template = BookingEmailTemplate::where('site_id', $siteId)
                ->where('type', $type)
                ->first();

            if (!$template) {
                $template = new BookingEmailTemplate([
                    'site_id' => $siteId,
                    'type' => $type,
                    'subject' => $this->defaultTemplates[$type]['subject'],
                    'body_html' => $this->defaultTemplates[$type]['body_html'],
                ]);
            }

            $templates[] = $template;
        }

        return response()->json($templates);
    }

    public function upsert(Request $request, string $siteId): JsonResponse
    {
        $data = $request->validate([
            'type'      => 'required|in:confirmation,reminder,review',
            'subject'   => 'required|string|max:255',
            'body_html' => 'required|string',
        ]);

        $template = BookingEmailTemplate::updateOrCreate(
            ['site_id' => $siteId, 'type' => $data['type']],
            ['subject' => $data['subject'], 'body_html' => $data['body_html']]
        );

        return response()->json($template, 201);
    }
}
