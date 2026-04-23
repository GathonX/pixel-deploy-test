<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AccountDeletionFeedback extends Model
{
    protected $table = 'account_deletion_feedbacks';
    
    protected $fillable = [
        'user_id',
        'user_email',
        'user_name',
        'reason',
        'detailed_reason',
        'satisfaction_rating',
        'suggestions',
        'would_recommend',
        'additional_data',
        'account_deleted_at'
    ];

    protected $casts = [
        'additional_data' => 'array',
        'would_recommend' => 'boolean',
        'account_deleted_at' => 'datetime'
    ];

    const REASONS = [
        'too_expensive' => 'Trop cher',
        'not_useful' => 'Pas assez utile',
        'lack_features' => 'Manque de fonctionnalités',
        'poor_support' => 'Support client insuffisant',
        'technical_issues' => 'Problèmes techniques',
        'switching_competitor' => 'Migration vers un concurrent',
        'temporary_break' => 'Pause temporaire',
        'other' => 'Autre raison'
    ];

    public function getReasonLabelAttribute()
    {
        return self::REASONS[$this->reason] ?? $this->reason;
    }
}
