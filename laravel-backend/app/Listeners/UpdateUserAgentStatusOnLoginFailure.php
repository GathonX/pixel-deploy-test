<?php

namespace App\Listeners;

use App\Models\UserAgent;
use Illuminate\Auth\Events\Failed;
use Illuminate\Support\Facades\Log;

class UpdateUserAgentStatusOnLoginFailure
{
    public function handle(Failed $event)
    {
        // Trouver le dernier UserAgent lié à cette IP et à l'action "Connexion"
        $userAgent = UserAgent::where('ip_address', request()->ip())
            ->where('action', 'Connexion')
            ->orderBy('created_at', 'desc')
            ->first();

        if ($userAgent) {
            $userAgent->status = 'Échec';
            $userAgent->save();

            Log::info("🔴 UserAgent mis à jour pour échec de connexion", [
                'ip' => request()->ip(),
                'user_agent_id' => $userAgent->id,
            ]);
        }
    }
}