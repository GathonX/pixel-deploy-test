<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ChatMessage;
use Illuminate\Http\JsonResponse;

class ChatPikMessageController extends Controller
{

     public function index(Request $request): JsonResponse
    {
        $query = ChatMessage::with('user')->orderBy('created_at', 'desc');

        // Recherche
        if ($search = $request->query('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('message', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($q) use ($search) {
                      $q->where('name', 'like', "%{$search}%");
                  })
                  ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        // Filtre par origine
        if ($origin = $request->query('origin')) {
            $query->where('origin', $origin);
        }

        // Filtre par date
        if ($from = $request->query('from_date')) {
            $query->whereDate('created_at', '>=', $from);
        }
        if ($to = $request->query('to_date')) {
            $query->whereDate('created_at', '<=', $to);
        }

        // Pagination
        $perPage = $request->query('per_page', 10);
        $messages = $query->paginate($perPage);

        return response()->json([
            'data' => $messages->items(),
            'current_page' => $messages->currentPage(),
            'last_page' => $messages->lastPage(),
            'per_page' => $messages->perPage(),
            'total' => $messages->total(),
        ]);
    }

    public function destroy($id): JsonResponse
    {
        $message = ChatMessage::findOrFail($id);
        $message->delete();

        return response()->json(['message' => 'Message supprimé avec succès']);
    }

    public function bulkDelete(Request $request): JsonResponse
    {
        $request->validate([
            'ids' => 'required|array',
            'ids.*' => 'exists:chat_messages,id',
        ]);

        ChatMessage::whereIn('id', $request->input('ids'))->delete();

        return response()->json(['message' => 'Messages supprimés avec succès']);
    }

}
