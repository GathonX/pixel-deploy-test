<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketHistory extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'user_id',
        'action',
        'field',
        'old_value',
        'new_value',
        'comment',
    ];

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Enregistre une modification du ticket
     */
    public static function logChange(int $ticketId, int $userId, string $action, ?string $field = null, ?string $oldValue = null, ?string $newValue = null, ?string $comment = null): void
    {
        static::create([
            'ticket_id' => $ticketId,
            'user_id' => $userId,
            'action' => $action,
            'field' => $field,
            'old_value' => $oldValue,
            'new_value' => $newValue,
            'comment' => $comment,
        ]);
    }

    /**
     * Obtient le label formaté de l'action
     */
    public function getActionLabelAttribute(): string
    {
        try {
            return match($this->action) {
                'status_changed' => '🔄 Statut modifié',
                'assigned' => '👤 Assigné',
                'unassigned' => '❌ Désassigné',
                'priority_changed' => '⚠️ Priorité modifiée',
                'created' => '✨ Ticket créé',
                default => '📝 Modification',
            };
        } catch (\Exception $e) {
            return '📝 Modification';
        }
    }

    /**
     * Obtient la description formatée
     */
    public function getFormattedDescriptionAttribute(): string
    {
        try {
            return match($this->action) {
                'status_changed' => "Statut changé de \"{$this->old_value}\" vers \"{$this->new_value}\"",
                'assigned' => "Assigné à {$this->new_value}",
                'unassigned' => "Désassigné de {$this->old_value}",
                'priority_changed' => "Priorité changée de \"{$this->old_value}\" vers \"{$this->new_value}\"",
                'created' => "Ticket créé",
                default => $this->comment ?? 'Modification apportée',
            };
        } catch (\Exception $e) {
            return $this->comment ?? 'Modification apportée';
        }
    }
}