<?php

namespace App\Http\Requests\Blog;

use Illuminate\Foundation\Http\FormRequest;

class UpdateBlogPostRequest extends FormRequest
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
            'title' => 'sometimes|string|min:3|max:255',
            'summary' => 'sometimes|string|min:10|max:500',
            'content' => 'sometimes|string|min:50',
            'header_image' => 'sometimes|url|max:2048',
            'tags' => 'sometimes|array|max:10',
            'tags.*' => 'string|max:50|regex:/^[a-zA-Z0-9\s\-_]+$/',
            'categories' => 'sometimes|array|max:5',
            'categories.*' => 'string|max:100|regex:/^[a-zA-Z0-9\s\-_]+$/',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'title.min' => 'Le titre doit contenir au moins 3 caractères',
            'title.max' => 'Le titre ne peut pas dépasser 255 caractères',
            'summary.min' => 'Le résumé doit contenir au moins 10 caractères',
            'summary.max' => 'Le résumé ne peut pas dépasser 500 caractères',
            'content.min' => 'Le contenu doit contenir au moins 50 caractères',
            'header_image.url' => 'L\'image de header doit être une URL valide',
            'header_image.max' => 'L\'URL de l\'image ne peut pas dépasser 2048 caractères',
            'tags.max' => 'Vous ne pouvez pas ajouter plus de 10 tags',
            'tags.*.max' => 'Chaque tag ne peut pas dépasser 50 caractères',
            'tags.*.regex' => 'Les tags ne peuvent contenir que des lettres, chiffres, espaces, tirets et underscores',
            'categories.max' => 'Vous ne pouvez pas ajouter plus de 5 catégories',
            'categories.*.max' => 'Chaque catégorie ne peut pas dépasser 100 caractères',
            'categories.*.regex' => 'Les catégories ne peuvent contenir que des lettres, chiffres, espaces, tirets et underscores',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'title' => 'titre',
            'summary' => 'résumé',
            'content' => 'contenu',
            'header_image' => 'image de header',
            'tags' => 'tags',
            'categories' => 'catégories',
        ];
    }
}