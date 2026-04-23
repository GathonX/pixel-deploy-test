<?php

namespace App\Http\Requests\Interaction;

use Illuminate\Foundation\Http\FormRequest;
use App\Models\Reaction;

class StoreReactionRequest extends FormRequest
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
            'reactable_type' => 'required|in:blog_post,social_media_post,comment',
            'reactable_id' => 'required|integer|min:1',
            'type' => 'sometimes|in:' . implode(',', Reaction::TYPES),
        ];
    }

    /**
     * Get custom messages for validator errors.
     */
    public function messages(): array
    {
        return [
            'reactable_type.required' => 'Le type d\'élément est obligatoire',
            'reactable_type.in' => 'Le type d\'élément doit être : blog_post, social_media_post ou comment',
            'reactable_id.required' => 'L\'ID de l\'élément est obligatoire',
            'reactable_id.integer' => 'L\'ID de l\'élément doit être un nombre entier',
            'reactable_id.min' => 'L\'ID de l\'élément doit être positif',
            'type.in' => 'Le type de réaction doit être : ' . implode(', ', Reaction::TYPES),
        ];
    }

    /**
     * Get custom attributes for validator errors.
     */
    public function attributes(): array
    {
        return [
            'reactable_type' => 'type d\'élément',
            'reactable_id' => 'ID de l\'élément',
            'type' => 'type de réaction',
        ];
    }

    /**
     * Prepare the data for validation.
     */
    protected function prepareForValidation(): void
    {
        // Normaliser le type de réaction (défaut : like)
        if (!$this->has('type') || empty($this->type)) {
            $this->merge(['type' => 'like']);
        } else {
            $this->merge(['type' => strtolower(trim($this->type))]);
        }

        // Normaliser le type d'élément
        if ($this->has('reactable_type')) {
            $this->merge([
                'reactable_type' => strtolower(trim($this->reactable_type))
            ]);
        }
    }

    /**
     * Configure the validator instance.
     */
    public function withValidator($validator): void
    {
        $validator->after(function ($validator) {
            // Vérifier que l'élément à réagir existe
            $type = $this->reactable_type;
            $id = $this->reactable_id;

            if ($type && $id) {
                $model = match($type) {
                    'blog_post' => \App\Models\BlogPost::class,
                    'social_media_post' => \App\Models\SocialMediaPost::class,
                    'comment' => \App\Models\Comment::class,
                    default => null
                };

                if ($model && !$model::find($id)) {
                    $validator->errors()->add('reactable_id', 'L\'élément à réagir n\'existe pas');
                }
            }

            // Vérifier que l'utilisateur ne réagit pas à son propre contenu (optionnel)
            if ($type && $id && auth()->user()) {
                $userId = auth()->user()->id;
                $isOwnContent = false;

                if ($type === 'blog_post') {
                    $post = \App\Models\BlogPost::find($id);
                    $isOwnContent = $post && $post->user_id === $userId;
                } elseif ($type === 'social_media_post') {
                    $post = \App\Models\SocialMediaPost::find($id);
                    $isOwnContent = $post && $post->user_id === $userId;
                } elseif ($type === 'comment') {
                    $comment = \App\Models\Comment::find($id);
                    $isOwnContent = $comment && $comment->user_id === $userId;
                }

                // Note: On peut autoriser les réactions sur son propre contenu
                // Décommenter si on veut l'interdire :
                // if ($isOwnContent) {
                //     $validator->errors()->add('reactable_id', 'Vous ne pouvez pas réagir à votre propre contenu');
                // }
            }
        });
    }
}