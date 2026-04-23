<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BusinessKeyWords extends Model
{
    protected $fillable = ['keyword', 'type', 'project_id'];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }
}
