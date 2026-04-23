<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkspaceUser extends Model
{
    protected $fillable = [
        'workspace_id',
        'user_id',
        'role',
        'site_id',
        'joined_at',
        'client_data_pin',
    ];

    protected $casts = [
        'joined_at' => 'datetime',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isAdmin(): bool
    {
        return in_array($this->role, ['owner', 'admin']);
    }

    public function isClient(): bool
    {
        return $this->role === 'client';
    }

    public function hasDataPin(): bool
    {
        return !is_null($this->client_data_pin);
    }
}
