<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\DatabaseMessage;
use App\Models\TicketMessage;

class NewTicketMessageNotification extends Notification
{
    use Queueable;

    protected TicketMessage $message;

    public function __construct(TicketMessage $message)
    {
        $this->message = $message;
    }

    public function via($notifiable): array
    {
        return ['database'];
    }

    public function toDatabase($notifiable): array
    {
        $ticket = $this->message->ticket()->first();

        return [
            'ticket_id'    => $ticket->id,
            'message_id'   => $this->message->id,
            'sender'       => $this->message->sender,
            'excerpt'      => substr($this->message->text, 0, 50),
            'created_at'   => $this->message->created_at->toDateTimeString(),
        ];
    }
}
