<?php

// laravel-backend/app/Http/Requests/StoreReservationRequest.php
// Commande: php artisan make:request StoreReservationRequest

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Carbon\Carbon;

class StoreReservationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Pas d'authentification requise pour l'iFrame
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'client_id' => [
                'required',
                'string',
                'max:100',
                'regex:/^[a-zA-Z0-9_-]+$/' // Alphanumerique, tirets et underscores seulement
            ],
            'name' => [
                'required',
                'string',
                'max:255',
                'min:2'
            ],
            'email' => [
                'required',
                'email:rfc,dns',
                'max:255'
            ],
            'phone' => [
                'nullable',
                'string',
                'max:20',
                'regex:/^[\d\s\+\-\(\)\.]+$/' // Numéros, espaces, +, -, (, ), .
            ],
            'date' => [
                'required',
                'date',
                'after_or_equal:today',
                'before:' . now()->addMonths(6)->format('Y-m-d') // Max 6 mois à l'avance
            ],
            'time' => [
                'required',
                'date_format:H:i'
            ],
            'guests' => [
                'required',
                'integer',
                'min:1',
                'max:20' // Maximum 20 personnes
            ],
            'description_interest' => [
                'nullable',
                'string',
                'max:1000'
            ],
            'details' => [
                'nullable',
                'string',
                'max:2000'
            ]
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'client_id.required' => 'L\'identifiant client est requis.',
            'client_id.regex' => 'L\'identifiant client contient des caractères invalides.',
            'name.required' => 'Le nom est requis.',
            'name.min' => 'Le nom doit contenir au moins 2 caractères.',
            'email.required' => 'L\'email est requis.',
            'email.email' => 'L\'email doit être une adresse valide.',
            'phone.regex' => 'Le numéro de téléphone contient des caractères invalides.',
            'date.required' => 'La date est requise.',
            'date.after_or_equal' => 'La date ne peut pas être dans le passé.',
            'date.before' => 'La date ne peut pas être à plus de 6 mois.',
            'time.required' => 'L\'heure est requise.',
            'time.date_format' => 'L\'heure doit être au format HH:MM.',
            'guests.required' => 'Le nombre de personnes est requis.',
            'guests.min' => 'Au moins 1 personne est requise.',
            'guests.max' => 'Maximum 20 personnes autorisées.',
            'description_interest.max' => 'La description d\'intérêt ne peut pas dépasser 1000 caractères.',
            'details.max' => 'Les détails ne peuvent pas dépasser 2000 caractères.'
        ];
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Validation personnalisée : vérifier que la date/heure est dans le futur
            if ($this->date && $this->time) {
                try {
                    $reservationDateTime = Carbon::parse($this->date . ' ' . $this->time);
                    if ($reservationDateTime->isPast()) {
                        $validator->errors()->add(
                            'time', 
                            'La date et l\'heure doivent être dans le futur.'
                        );
                    }
                } catch (\Exception $e) {
                    $validator->errors()->add(
                        'datetime', 
                        'Date et heure invalides.'
                    );
                }
            }

            // Validation des heures d'ouverture (8h-20h par exemple)
            if ($this->time) {
                $hour = (int) explode(':', $this->time)[0];
                if ($hour < 8 || $hour > 20) {
                    $validator->errors()->add(
                        'time',
                        'Les réservations sont uniquement acceptées entre 8h00 et 20h00.'
                    );
                }
            }
        });
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'client_id' => 'identifiant client',
            'name' => 'nom',
            'email' => 'email',
            'phone' => 'téléphone',
            'date' => 'date',
            'time' => 'heure',
            'guests' => 'nombre de personnes',
            'description_interest' => 'description d\'intérêt',
            'details' => 'détails'
        ];
    }
}