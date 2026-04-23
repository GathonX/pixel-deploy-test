<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use App\Models\UserAgent;
use GeoIp2\Database\Reader;
use Jenssegers\Agent\Agent;

class TrackingController extends Controller
{
    public function setConsent(Request $request)
    {
        try {
            $consent = $request->input('consent') === true || $request->input('consent') === 'true';
            
            // ✅ Configuration session explicite
            Session::put('tracking_consent', $consent);
            Session::save(); // Force la sauvegarde
            
            // ✅ Démarrage explicite de la session
            if (!Session::isStarted()) {
                Session::start();
            }
            
            Log::info('🔐 Consentement mis à jour', [
                'consent' => $consent,
                'session_id' => Session::getId(),
                'session_started' => Session::isStarted(),
                'session_data' => Session::all(), // Pour debug
            ]);

            if ($consent) {
                $this->createUserAgentEntry($request);
            }

            return response()->json([
                'message' => 'Consentement mis à jour',
                'consent' => $consent,
                'session_id' => Session::getId()
            ]);
            
        } catch (\Exception $e) {
            Log::error('❌ Erreur dans setConsent', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return response()->json(['message' => 'Erreur lors de la mise à jour du consentement'], 500);
        }
    }

    private function createUserAgentEntry(Request $request)
    {
        try {
            $agent = new Agent();
            $agent->setUserAgent($request->userAgent() ?? 'unknown');

            $userAgent = new UserAgent();
            $userAgent->agent = $request->userAgent() ?? 'unknown';
            $userAgent->page = $request->header('Referer') ?? $request->getRequestUri();
            $userAgent->language = $request->header('Accept-Language', 'unknown');
            $userAgent->ip_address = $request->ip();

            $ip = $userAgent->ip_address;
            if ($this->isPrivateIp($ip)) {
                $userAgent->timezone = $request->input('timezone', 'UTC');
            } else {
                try {
                    $reader = new Reader(storage_path('app/geoip/GeoLite2-City.mmdb'));
                    $record = $reader->city($ip);
                    $userAgent->timezone = $record->location->timeZone ?? 'UTC';
                } catch (\Exception $e) {
                    $userAgent->timezone = 'UTC';
                }
            }

            $browser = $agent->browser() ?? 'unknown';
            $platform = $agent->platform() ?? 'unknown';
            $userAgent->device = "$browser / $platform";
            $userAgent->action = 'Consentement accepté';
            $userAgent->user_type = auth()->check() ? (auth()->user()->is_admin ? 'admin' : 'user') : 'guest';
            $userAgent->user_id = auth()->id();
            $userAgent->status = 'Succès';

            $userAgent->save();
            
            Log::info('✅ UserAgent enregistré', [
                'id' => $userAgent->id,
                'page' => $userAgent->page,
                'user_type' => $userAgent->user_type,
                'action' => $userAgent->action,
            ]);
            
        } catch (\Exception $e) {
            Log::error('❌ Erreur création UserAgent', [
                'error' => $e->getMessage(),
            ]);
        }
    }

    private function isPrivateIp(string $ip): bool
    {
        return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
    }
}