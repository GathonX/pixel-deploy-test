<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class TicketMessageResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray($request): array
    {
        return [
            'id'         => $this->id,
            'sender'     => $this->sender,
            'text'       => $this->text,
            'created_at' => $this->created_at,
            'image_url'  => $this->image_url
                ? $this->buildFileUrl($this->image_url)
                : null,
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
