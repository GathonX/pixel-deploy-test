<?php

// app/Providers/EventServiceProvider.php


namespace App\Providers;

use App\Models\User;
use App\Observers\UserObserver;
use Illuminate\Foundation\Support\Providers\EventServiceProvider as ServiceProvider;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Failed;
use Illuminate\Auth\Events\Verified;
use App\Events\FeatureActivated;
use App\Listeners\UpdateUserAgentStatusOnLoginFailure;
use App\Listeners\SendMaskedReservationsSummary;

class EventServiceProvider extends ServiceProvider
{
    /**
     * The event listener mappings for the application.
     *
     * @var array<class-string, array<int, class-string>>
     */
    protected $listen = [
        Failed::class => [
            UpdateUserAgentStatusOnLoginFailure::class,
        ],

        // 🎉 ENVOI EMAIL RÉCAPITULATIF LORS DE L'ACTIVATION FEATURE RÉSERVATION
        FeatureActivated::class => [
            SendMaskedReservationsSummary::class,
        ],
    ];

    public function boot(): void
    {
        parent::boot();
        User::observe(UserObserver::class);
    }
}
