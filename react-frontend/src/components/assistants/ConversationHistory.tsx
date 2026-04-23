import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: string;
}

interface ConversationHistoryProps {
  onSelectConversation: (id: string) => void;
  selectedConversationId: string | null;
  onNewConversation: () => void;
}

export function ConversationHistory({
  onSelectConversation,
  selectedConversationId,
  onNewConversation,
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      toast.error("Erreur lors du chargement des conversations");
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (id: string) => {
    try {
      const response = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (response.ok) {
        setConversations(conversations.filter((c) => c.id !== id));
        if (selectedConversationId === id) {
          onNewConversation();
        }
        toast.success("Conversation supprimée");
      }
    } catch (error) {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <div className="w-80 border-r flex flex-col">
      <div className="p-4 border-b">
        <Button onClick={onNewConversation} className="w-full" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-2">
          {loading ? (
            <div className="text-center text-muted-foreground py-8">Chargement...</div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucune conversation
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg cursor-pointer hover:bg-accent transition-colors ${
                  selectedConversationId === conversation.id ? "bg-accent" : ""
                }`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare className="h-4 w-4 flex-shrink-0" />
                      <h3 className="font-medium text-sm truncate">
                        {conversation.title}
                      </h3>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conversation.lastMessage}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(conversation.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation(conversation.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
