<?php

namespace App\Http\Requests\Social;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\SocialMediaPost;

class StoreSocialPostRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     */
    public function rules(): array
    {
        return [
            'platform' => 'required|in:' . implode(',', SocialMediaPost::PLATFORMS),
            'status' => 'sometimes|in:draft,scheduled,published',
            'scheduled_at' => 'sometimes|date|after:now',
            'scheduled_time' => 'sometimes|date_format:H:i',
            'video' => 'sometimes|url|max:2048',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'platform.required' => 'La plateforme est obligatoire',
            'platform.in' => 'La plateforme doit être : ' . implode(', ', SocialMediaPost::PLATFORMS),
            'status.in' => 'Le statut doit être : draft, scheduled ou published',
            'scheduled_at.after' => 'La date de programmation doit être dans le futur',
            'scheduled_time.date_format' => 'Le format de l\'heure doit être HH:MM',
            'video.url' => 'La vidéo doit être une URL valide',
            'video.max' => 'L\'URL de la vidéo ne peut pas dépasser 2048 caractères',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'platform' => 'plateforme',
            'status' => 'statut',
            'scheduled_at' => 'date de programmation',
            'scheduled_time' => 'heure de programmation',
            'video' => 'vidéo',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Nettoyer le nom de la plateforme
        if ($this->has('platform')) {
            $this->merge([
                'platform' => strtolower(trim($this->platform))
            ]);
        }
    }
}