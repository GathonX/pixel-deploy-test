<?php

namespace App\Http\Requests\Blog;

use Illuminate\Foundation\Http\FormRequest;

class StoreBlogPostRequest extends FormRequest
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
            'status' => 'sometimes|in:draft,scheduled,published',
            'scheduled_at' => 'sometimes|date|after:now',
            'scheduled_time' => 'sometimes|date_format:H:i',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'status.in' => 'Le statut doit être : draft, scheduled ou published',
            'scheduled_at.after' => 'La date de programmation doit être dans le futur',
            'scheduled_time.date_format' => 'Le format de l\'heure doit être HH:MM',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'status' => 'statut',
            'scheduled_at' => 'date de programmation',
            'scheduled_time' => 'heure de programmation',
        ];
    }
}