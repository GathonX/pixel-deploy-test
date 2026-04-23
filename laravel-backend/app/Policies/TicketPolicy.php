<?php


// app/Policies/TicketPolicy.php

namespace App\Policies;

use App\Models\User;
use App\Models\Ticket;

class TicketPolicy
{
    public function view(User $user, Ticket $ticket): bool
    {
        return $user->id === $ticket->user_id || $user->is_admin;
    }

    // ⇣⇣⇣ on ajoute ça ⇣⇣⇣
    public function update(User $user, Ticket $ticket): bool
    {
        // autorise le propriétaire du ticket (l’utilisateur) et les admins
        return $user->id === $ticket->user_id || $user->is_admin;
    }

    public function delete(User $user, Ticket $ticket): bool
    {
        return $user->id === $ticket->user_id || $user->is_admin;
    }
}
