<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use App\Models\UserAgent;
use GeoIp2\Database\Reader;
use Jenssegers\Agent\Agent;

class LogUserAgent
{
    public function handle(Request $request, Closure $next)
    {
        // ✅ CORRECTION : Routes exclues mises à jour
        $excluded = [
            'sanctum/csrf-cookie',
            'tracking/consent',
            'payment/success',
            'payment/cancel',
          
        ];

        $uri = $request->path();

        // ✅ CORRECTION : Exclusion complète des routes réservations
        if (in_array($uri, $excluded) || 
            str_starts_with($uri, 'api/schedules') || 
            str_starts_with($uri, 'api/reservations')) {
            Log::debug('🚫 Route exclue du tracking', ['path' => $uri]);
            return $next($request);
        }

        $consent = Session::get('tracking_consent', false);
        Log::debug('🚨 Vérification du consentement', [
            'consent' => $consent,
            'method' => $request->method(),
            'uri' => $request->getRequestUri(),
            'ip' => $request->ip(),
            'session_id' => Session::getId(),
        ]);

        if (!$consent) {
            Log::info('🚫 Consentement manquant, aucun enregistrement');
            return $next($request);
        }

        $agent = new Agent();
        $agent->setUserAgent($request->userAgent() ?? 'unknown');

        $userAgent = new UserAgent();
        $userAgent->agent = $request->userAgent() ?? 'unknown';
        $userAgent->page = $request->getRequestUri();
        $userAgent->language = $request->header('Accept-Language', 'unknown');
        $userAgent->ip_address = $request->ip();

        $ip = $userAgent->ip_address;
        if ($this->isPrivateIp($ip)) {
            $userAgent->timezone = $request->input('timezone', 'UTC');
            Log::debug('🕒 IP privée détectée, utilisation du fuseau horaire par défaut ou client', [
                'ip' => $ip,
                'timezone' => $userAgent->timezone,
            ]);
        } else {
            try {
                $reader = new Reader(storage_path('app/geoip/GeoLite2-City.mmdb'));
                $record = $reader->city($ip);
                $userAgent->timezone = $record->location->timeZone ?? 'UTC';
            } catch (\Exception $e) {
                Log::error('⚠️ Erreur GeoIP', [
                    'ip' => $ip,
                    'error' => $e->getMessage(),
                ]);
                $userAgent->timezone = 'UTC';
            }
        }

        $browser = $agent->browser() ?? 'unknown';
        $platform = $agent->platform() ?? 'unknown';
        $userAgent->device = "$browser / $platform";

        $uri = $userAgent->page;
        $userAgent->action = match (true) {
            str_contains($uri, 'login') => 'Connexion',
            str_contains($uri, 'register') => 'Inscription',
            str_contains($uri, 'logout') => 'Déconnexion',
            default => 'Visite de page',
        };

        $userAgent->user_type = auth()->check() ? (auth()->user()->is_admin ? 'admin' : 'user') : 'guest';
        $userAgent->user_id = auth()->id();

        $response = $next($request);
        $userAgent->status = $response->isSuccessful() ? 'Succès' : 'Échec';

        try {
            $userAgent->save();
            Log::info('✅ UserAgent enregistré', [
                'id' => $userAgent->id,
                'page' => $userAgent->page,
                'user_type' => $userAgent->user_type,
                'user_id' => $userAgent->user_id,
                'action' => $userAgent->action,
                'ip' => $userAgent->ip_address,
                'device' => $userAgent->device,
                'timezone' => $userAgent->timezone,
            ]);
        } catch (\Exception $e) {
            Log::error('❌ Erreur lors de l\'enregistrement UserAgent', [
                'error' => $e->getMessage(),
                'page' => $userAgent->page,
                'user_type' => $userAgent->user_type,
            ]);
        }

        return $response;
    }

    private function isPrivateIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
    }
}