<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'category',
        'content',
        'is_active',
        'usage_count',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Scope pour les templates actifs
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope pour les templates d'une catégorie
     */
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    /**
     * Incrémente le compteur d'utilisation
     */
    public function incrementUsage(): void
    {
        $this->increment('usage_count');
    }

    /**
     * Templates par défaut à créer
     */
    public static function getDefaultTemplates(): array
    {
        return [
            [
                'name' => 'Problème résolu - Général',
                'category' => null,
                'content' => "Bonjour,\n\nVotre problème a été résolu. N'hésitez pas à nous recontacter si vous avez d'autres questions.\n\nCordialement,\nÉquipe Support PixelRise",
                'is_active' => true,
            ],
            [
                'name' => 'Mot de passe réinitialisé',
                'category' => 'Authentification',
                'content' => "Bonjour,\n\nVotre mot de passe a été réinitialisé. Vous devriez recevoir un email avec les instructions dans quelques minutes.\n\nSi vous ne recevez pas l'email, vérifiez vos spams.\n\nCordialement,\nÉquipe Support PixelRise",
                'is_active' => true,
            ],
            [
                'name' => 'Demande d\'informations complémentaires',
                'category' => null,
                'content' => "Bonjour,\n\nPour mieux vous aider, pourriez-vous nous fournir les informations suivantes :\n\n- [PRÉCISER LES INFORMATIONS NÉCESSAIRES]\n- Une capture d'écran du problème si possible\n- Les étapes qui ont mené au problème\n\nMerci de votre collaboration.\n\nCordialement,\nÉquipe Support PixelRise",
                'is_active' => true,
            ],
            [
                'name' => 'Problème technique en cours',
                'category' => 'Bug',
                'content' => "Bonjour,\n\nNous avons identifié le problème que vous rencontrez. Notre équipe technique travaille actuellement sur une solution.\n\nNous vous tiendrons informé de l'avancement et vous préviendrons dès que le problème sera résolu.\n\nMerci pour votre patience.\n\nCordialement,\nÉquipe Support PixelRise",
                'is_active' => true,
            ],
            [
                'name' => 'Facture envoyée',
                'category' => 'Facturation',
                'content' => "Bonjour,\n\nVotre facture a été générée et envoyée à votre adresse email.\n\nSi vous ne l'avez pas reçue, vérifiez vos spams ou téléchargez-la directement depuis votre espace client.\n\nCordialement,\nÉquipe Support PixelRise",
                'is_active' => true,
            ],
        ];
    }
}