<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\DatabaseMessage;
use App\Models\Ticket;

class NewTicketSubmittedNotification extends Notification
{
    use Queueable;

    protected Ticket $ticket;

    public function __construct(Ticket $ticket)
    {
        $this->ticket = $ticket;
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        return [
            'ticket_id'  => $this->ticket->id,
            'title'      => $this->ticket->title,
            'excerpt'    => substr($this->ticket->description, 0, 50),
            'created_at' => $this->ticket->created_at->toDateTimeString(),
        ];
    }
}
