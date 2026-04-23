<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class ContactMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'email', 
        'message',
        'source',
        'status',
        'metadata'
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    // Statuts possibles pour les messages de contact
    const STATUS_NEW = 'new';
    const STATUS_READ = 'read';
    const STATUS_PROCESSED = 'processed';
    const STATUS_ARCHIVED = 'archived';

    /**
     * Relation avec l'utilisateur (client)
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Scope pour filtrer par utilisateur
     */
    public function scopeForUser($query, string $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope pour filtrer par statut
     */
    public function scopeWithStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope pour filtrer par source
     */
    public function scopeFromSource($query, string $source)
    {
        return $query->where('source', $source);
    }
}
