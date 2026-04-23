<?php
namespace App\Providers;

use App\Models\BlogComment;
use App\Models\BlogPost;
use App\Models\SocialMediaPost;
use App\Models\Ticket;
use App\Policies\BlogCommentPolicy;
use App\Policies\BlogPostPolicy;
use App\Policies\SocialMediaPostPolicy;
use App\Policies\TicketPolicy;
use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        Ticket::class => TicketPolicy::class,
         SocialMediaPost::class => SocialMediaPostPolicy::class,
         BlogPost::class => BlogPostPolicy::class,
         BlogComment::class => BlogCommentPolicy::class,
    ];

    public function boot()
    {
        $this->registerPolicies();
    }
}
