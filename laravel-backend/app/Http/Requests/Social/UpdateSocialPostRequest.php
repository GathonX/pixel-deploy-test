<?php

namespace App\Http\Requests\Social;

use Illuminate\Foundation\Http\FormRequest;

class UpdateSocialPostRequest extends FormRequest
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
            'content' => 'sometimes|string|min:1|max:5000',
            'images' => 'sometimes|array|max:10',
            'images.*' => 'url|max:2048',
            'video' => 'sometimes|url|max:2048',
            'tags' => 'sometimes|array|max:30',
            'tags.*' => 'string|max:50|regex:/^#?[a-zA-Z0-9\s\-_]+$/',
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
            'content.min' => 'Le contenu ne peut pas être vide',
            'content.max' => 'Le contenu ne peut pas dépasser 5000 caractères',
            'images.max' => 'Vous ne pouvez pas ajouter plus de 10 images',
            'images.*.url' => 'Chaque image doit être une URL valide',
            'images.*.max' => 'L\'URL de l\'image ne peut pas dépasser 2048 caractères',
            'video.url' => 'La vidéo doit être une URL valide',
            'video.max' => 'L\'URL de la vidéo ne peut pas dépasser 2048 caractères',
            'tags.max' => 'Vous ne pouvez pas ajouter plus de 30 tags',
            'tags.*.max' => 'Chaque tag ne peut pas dépasser 50 caractères',
            'tags.*.regex' => 'Les tags ne peuvent contenir que des lettres, chiffres, espaces, tirets et underscores (# optionnel)',
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
            'content' => 'contenu',
            'images' => 'images',
            'video' => 'vidéo',
            'tags' => 'tags',
            'categories' => 'catégories',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Nettoyer les tags (ajouter # si manquant pour certaines plateformes)
        if ($this->has('tags') && is_array($this->tags)) {
            $cleanTags = array_map(function($tag) {
                $tag = trim($tag);
                // Ajouter # si pas présent et si ce n'est pas vide
                if (!empty($tag) && !str_starts_with($tag, '#')) {
                    return '#' . $tag;
                }
                return $tag;
            }, $this->tags);

            $this->merge(['tags' => array_filter($cleanTags)]);
        }

        // Nettoyer le tableau d'images
        if ($this->has('images') && is_array($this->images)) {
            $cleanImages = array_filter($this->images, function($image) {
                return !empty(trim($image));
            });
            $this->merge(['images' => array_values($cleanImages)]);
        }
    }
}