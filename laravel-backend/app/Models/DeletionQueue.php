<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeletionQueue extends Model
{
    protected $table = 'deletion_queue';

    protected $fillable = [
        'workspace_id',
        'scheduled_delete_at',
        'status',
        'last_notice_sent_at',
    ];

    protected $casts = [
        'scheduled_delete_at' => 'datetime',
        'last_notice_sent_at' => 'datetime',
    ];

    public function workspace(): BelongsTo
    {
        return $this->belongsTo(Workspace::class);
    }

    public function isPending(): bool
    {
        return $this->status === 'pending';
    }

    public function cancel(): void
    {
        $this->update(['status' => 'canceled']);
    }
}
