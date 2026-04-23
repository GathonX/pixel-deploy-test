<?php

namespace App\Http\Resources;

use Illuminate\Http\Resources\Json\JsonResource;
use App\Http\Resources\TicketMessageResource;

class TicketResource extends JsonResource
{
    public function toArray($request): array
    {
        return [
            'id'          => $this->id,
            'title'       => $this->title,
            'description' => $this->description,
            'category'    => $this->category,
            'status'      => $this->status,
            'priority'    => $this->priority,
            'image_url'   => $this->image_url
                ? $this->buildFileUrl($this->image_url)
                : null,
            // ✅ Nouveaux champs SLA
            'estimated_response_hours' => $this->estimated_response_hours,
            'estimated_response'       => $this->estimated_response,
            'time_remaining'           => $this->time_remaining,
            'is_overdue'               => $this->isOverdue(),
            'first_response_at'        => $this->first_response_at,
            'resolved_at'              => $this->resolved_at,
            // ✅ Champs feedback de satisfaction  
            'satisfaction_rating'      => $this->satisfaction_rating,
            'satisfaction_comment'     => $this->satisfaction_comment,
            'satisfaction_emoji'       => $this->satisfaction_emoji,
            'feedback_submitted_at'    => $this->feedback_submitted_at,
            'can_submit_feedback'      => $this->canSubmitFeedback(),
            // ✅ Champs assignation
            'assigned_to'              => $this->assigned_to,
            'assigned_at'              => $this->assigned_at,
            'assigned_admin'           => $this->whenLoaded('assignedTo', function () {
                return $this->assignedTo ? [
                    'id' => $this->assignedTo->id,
                    'name' => $this->assignedTo->name,
                    'email' => $this->assignedTo->email,
                ] : null;
            }),
            'created_at'  => $this->created_at,
            'updated_at'  => $this->updated_at,
            'user'        => [
                'id'    => $this->user->id,
                'name'  => $this->user->name,
                'email' => $this->user->email,
            ],
            'messages'    => TicketMessageResource::collection($this->whenLoaded('messages')),
        ];
    }

    /**
     * ✅ CORRECTION : Construction URL avec headers CORS appropriés
     */
    private function buildFileUrl(string $filePath): string
    {
        // ✅ FORCER l'URL complète avec domaine pour éviter les problèmes de contexte
        $baseUrl = config('app.url', 'http://localhost:8000');
        return $baseUrl . '/storage/' . $filePath;
    }
}
