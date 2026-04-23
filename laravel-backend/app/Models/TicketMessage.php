<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TicketMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'ticket_id',
        'sender',
        'text',
        'image_url',
    ];

    public function ticket()
    {
        return $this->belongsTo(Ticket::class);
    }
}
