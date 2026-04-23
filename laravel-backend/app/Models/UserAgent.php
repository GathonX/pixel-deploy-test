<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserAgent extends Model
{
    protected $fillable = [
        'agent',
        'action',
        'status',
        'page',
        'language',
        'timezone',
        'device', // Ajout de device ici
        'ip_address',
        'user_type',
        'user_id',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}