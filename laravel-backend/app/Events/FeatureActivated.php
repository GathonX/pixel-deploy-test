<?php

namespace App\Events;

use App\Models\UserFeatureAccess;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class FeatureActivated
{
    use Dispatchable, SerializesModels;

    public $featureAccess;
    public $userId;
    public $featureKey;

    public function __construct(UserFeatureAccess $featureAccess, string $featureKey)
    {
        $this->featureAccess = $featureAccess;
        $this->userId = $featureAccess->user_id;
        $this->featureKey = $featureKey;
    }
}
