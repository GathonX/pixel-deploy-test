<?php

namespace App\Jobs;

use App\Models\SiteDomain;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class VerifyDomainJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 5;
    public int $backoff = 300; // retry every 5 minutes

    public function __construct(
        public readonly string $domainId
    ) {}

    private function resolveARecord(string $domainName): ?string
    {
        try {
            $ctx = stream_context_create(['http' => ['timeout' => 5, 'ignore_errors' => true]]);
            $json = @file_get_contents(
                "https://dns.google/resolve?name={$domainName}&type=A",
                false, $ctx
            );
            if (!$json) return null;
            $data = json_decode($json, true);
            if (($data['Status'] ?? -1) !== 0 || empty($data['Answer'])) return null;
            foreach ($data['Answer'] as $answer) {
                if ($answer['type'] === 1) return $answer['data'];
            }
        } catch (\Exception $e) {
            Log::warning("DoH lookup failed for {$domainName}: " . $e->getMessage());
        }
        return null;
    }

    public function handle(): void
    {
        $domain = SiteDomain::find($this->domainId);

        if (!$domain || in_array($domain->status, ['active', 'dns_verified'])) {
            return;
        }

        $domainName = $domain->domain;
        $expectedIp = '194.163.134.150';

        $actualIp = $this->resolveARecord($domainName);

        if ($actualIp !== $expectedIp) {
            Log::info("Domain {$domainName}: A = " . ($actualIp ?? 'none') . ", expected {$expectedIp}. Retrying in 5 min.");
            $domain->update(['status' => 'pending']);
            $this->release(300);
            return;
        }

        $domain->update(['status' => 'dns_verified']);
        Log::info("Domain {$domainName}: DNS verified via DoH (A = {$expectedIp}). Awaiting SSL.");
    }
}
