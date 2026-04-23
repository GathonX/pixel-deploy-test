<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Ticket extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'category',
        'image_url',
        'status',
        'priority',
        'estimated_response_hours',
        'first_response_at',
        'resolved_at',
        'satisfaction_rating',
        'satisfaction_comment',
        'feedback_submitted_at',
        'assigned_to',
        'assigned_at',
    ];

    protected $casts = [
        'first_response_at' => 'datetime',
        'resolved_at' => 'datetime',
        'feedback_submitted_at' => 'datetime',
        'assigned_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Admin assigné à ce ticket
     */
    public function assignedTo()
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    /**
     * Tous les messages liés à ce ticket.
     */
    public function messages()
    {
        return $this->hasMany(TicketMessage::class);
    }

    /**
     * ✅ Historique des modifications du ticket
     */
    public function history()
    {
        return $this->hasMany(TicketHistory::class)->orderBy('created_at', 'desc');
    }

    /**
     * ✅ Calcule l'estimation du temps de réponse basé sur la catégorie et priorité
     */
    public function calculateEstimatedResponse(): int
    {
        // SLA par catégorie (en heures)
        $categorySLA = [
            'Bug' => 4,           // Bugs critiques = 4h
            'Authentification' => 6,  // Problèmes de connexion = 6h  
            'Facturation' => 8,   // Questions factures = 8h
            'Fonctionnalité' => 24,   // Demandes features = 24h
            'Autre' => 48,        // Général = 48h
        ];

        $baseHours = $categorySLA[$this->category] ?? 24;

        // Modifier selon la priorité
        return match($this->priority) {
            'high' => max(1, (int)($baseHours * 0.5)),    // Diviser par 2
            'low' => (int)($baseHours * 1.5),             // Multiplier par 1.5  
            default => $baseHours,                         // Garder tel quel
        };
    }

    /**
     * ✅ Obtient le temps de réponse estimé formaté
     */
    public function getEstimatedResponseAttribute(): string
    {
        $hours = $this->estimated_response_hours ?? $this->calculateEstimatedResponse();
        
        if ($hours <= 24) {
            return $hours . 'h';
        }
        
        $days = round($hours / 24, 1);
        return $days . 'j';
    }

    /**
     * ✅ Vérifie si le ticket est en retard
     */
    public function isOverdue(): bool
    {
        if ($this->status === 'resolved' || $this->first_response_at) {
            return false;
        }

        $estimatedHours = $this->estimated_response_hours ?? $this->calculateEstimatedResponse();
        $deadline = $this->created_at->addHours($estimatedHours);
        
        return now()->gt($deadline);
    }

    /**
     * ✅ Temps restant avant deadline
     */
    public function getTimeRemainingAttribute(): string
    {
        if ($this->status === 'resolved' || $this->first_response_at) {
            return 'Répondu';
        }

        $estimatedHours = $this->estimated_response_hours ?? $this->calculateEstimatedResponse();
        $deadline = $this->created_at->addHours($estimatedHours);
        $remaining = now()->diffInHours($deadline, false);

        if ($remaining < 0) {
            return 'En retard de ' . abs($remaining) . 'h';
        }

        if ($remaining < 24) {
            return $remaining . 'h restantes';
        }

        return round($remaining / 24, 1) . 'j restantes';
    }

    /**
     * ✅ Vérifie si le feedback peut être soumis
     */
    public function canSubmitFeedback(): bool
    {
        return $this->status === 'resolved' 
            && $this->resolved_at 
            && !$this->feedback_submitted_at;
    }

    /**
     * ✅ Obtient l'emoji de satisfaction
     */
    public function getSatisfactionEmojiAttribute(): string
    {
        return match($this->satisfaction_rating) {
            1 => '😞',
            2 => '😕',
            3 => '😐',
            4 => '😊',
            5 => '😍',
            default => '❓',
        };
    }

    /**
     * ✅ Assigne le ticket à un admin
     */
    public function assignTo(?int $adminId, ?int $assignedBy = null): void
    {
        $oldAssignedTo = $this->assigned_to;
        $oldAdminName = $oldAssignedTo ? \App\Models\User::find($oldAssignedTo)?->name : null;
        $newAdminName = $adminId ? \App\Models\User::find($adminId)?->name : null;
        
        $this->update([
            'assigned_to' => $adminId,
            'assigned_at' => $adminId ? now() : null,
        ]);

        // ✅ Enregistrer dans l'historique
        if ($assignedBy) {
            if ($adminId && !$oldAssignedTo) {
                // Assignation
                \App\Models\TicketHistory::logChange($this->id, $assignedBy, 'assigned', 'assigned_to', null, $newAdminName);
            } elseif (!$adminId && $oldAssignedTo) {
                // Désassignation
                \App\Models\TicketHistory::logChange($this->id, $assignedBy, 'unassigned', 'assigned_to', $oldAdminName, null);
            } elseif ($adminId !== $oldAssignedTo) {
                // Réassignation
                \App\Models\TicketHistory::logChange($this->id, $assignedBy, 'assigned', 'assigned_to', $oldAdminName, $newAdminName);
            }
        }

        // ✅ Notifier le nouvel assigné
        if ($adminId && $adminId !== $oldAssignedTo) {
            \App\Models\Notification::create([
                'user_id' => $adminId,
                'type' => 'ticket_assigned',
                'priority' => 'normal',
                'status' => 'unread',
                'title' => '🎯 Ticket assigné',
                'message' => "Le ticket #{$this->id} vous a été assigné: {$this->title}",
                'data' => [
                    'ticket_id' => $this->id,
                    'ticket_title' => $this->title,
                    'category' => $this->category,
                    'priority' => $this->priority,
                    'assigned_by' => $assignedBy,
                    'user_name' => $this->user->name,
                ],
                'href' => "/admin/tickets/{$this->id}",
                'category' => 'assignment',
                'tags' => ['ticket', 'assignment'],
                'show_badge' => true,
            ]);
        }
    }

}
