<?php

namespace App\Http\Requests\Interaction;

use Illuminate\Foundation\Http\FormRequest;

class StoreCommentRequest extends FormRequest
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
            'commentable_type' => 'required|in:blog_post,social_media_post',
            'commentable_id' => 'required|integer|min:1',
            'content' => 'required|string|min:3|max:1000',
            'parent_id' => 'sometimes|integer|exists:comments,id',
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'commentable_type.required' => 'Le type d\'élément est obligatoire',
            'commentable_type.in' => 'Le type d\'élément doit être : blog_post ou social_media_post',
            'commentable_id.required' => 'L\'ID de l\'élément est obligatoire',
            'commentable_id.integer' => 'L\'ID de l\'élément doit être un nombre entier',
            'commentable_id.min' => 'L\'ID de l\'élément doit être positif',
            'content.required' => 'Le contenu du commentaire est obligatoire',
            'content.min' => 'Le commentaire doit contenir au moins 3 caractères',
            'content.max' => 'Le commentaire ne peut pas dépasser 1000 caractères',
            'parent_id.integer' => 'L\'ID du commentaire parent doit être un nombre entier',
            'parent_id.exists' => 'Le commentaire parent n\'existe pas',
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'commentable_type' => 'type d\'élément',
            'commentable_id' => 'ID de l\'élément',
            'content' => 'contenu',
            'parent_id' => 'commentaire parent',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Nettoyer le contenu du commentaire
        if ($this->has('content')) {
            $this->merge([
                'content' => trim($this->content)
            ]);
        }

        // Normaliser le type
        if ($this->has('commentable_type')) {
            $this->merge([
                'commentable_type' => strtolower(trim($this->commentable_type))
            ]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Vérifier que l'élément commentable existe
            $type = $this->commentable_type;
            $id = $this->commentable_id;

            if ($type && $id) {
                $model = match($type) {
                    'blog_post' => \App\Models\BlogPost::class,
                    'social_media_post' => \App\Models\SocialMediaPost::class,
                    default => null
                };

                if ($model && !$model::find($id)) {
                    $validator->errors()->add('commentable_id', 'L\'élément à commenter n\'existe pas');
                }
            }

            // Vérifier les niveaux de commentaires (max 2 niveaux)
            if ($this->parent_id) {
                $parentComment = \App\Models\Comment::find($this->parent_id);
                if ($parentComment && $parentComment->parent_id) {
                    $validator->errors()->add('parent_id', 'Vous ne pouvez pas répondre à une réponse de commentaire');
                }
            }
        });
    }
}