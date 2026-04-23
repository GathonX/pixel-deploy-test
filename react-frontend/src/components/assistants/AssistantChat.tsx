
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";

// Type definitions for our messages
type MessageType = "user" | "assistant";

interface Message {
  id: string;
  content: string;
  type: MessageType;
  timestamp: Date;
}

interface AssistantChatProps {
  assistantId: string | null;
}

export function AssistantChat({ assistantId }: AssistantChatProps) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Sample assistant data - in a real app, this would be fetched from a database
  const assistantName = assistantId === "default" ? "Assistant PixelRise" : "Assistant personnalisé";
  
  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initialize with a greeting
  useEffect(() => {
    if (assistantId && messages.length === 0) {
      setMessages([
        {
          id: "greeting",
          content: `Bonjour, je suis ${assistantName}. Comment puis-je vous aider aujourd'hui?`,
          type: "assistant",
          timestamp: new Date(),
        },
      ]);
    }
  }, [assistantId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) return;
    
    // Add user message to chat
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      type: "user",
      timestamp: new Date(),
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);
    
    try {
      // Simulate API call delay - replace with actual AI API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock AI response - replace with actual AI response
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: `C'est une réponse de démonstration à votre message: "${input}"`,
        type: "assistant",
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, aiResponse]);
    } catch (error) {
      console.error("Error communicating with assistant:", error);
      
      // Add error message
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Désolé, je n'ai pas pu traiter votre demande. Veuillez réessayer.",
        type: "assistant",
        timestamp: new Date(),
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col bg-card rounded-lg border shadow h-[70vh]">
      <div className="p-4 border-b">
        <h2 className="font-medium">{assistantName}</h2>
      </div>
      
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4 pb-4">
          {messages.map((message) => (
            <div 
              key={message.id}
              className={`flex gap-3 ${message.type === "user" ? "justify-end" : "justify-start"}`}
            >
              {message.type === "assistant" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              )}
              
              <Card className={`px-4 py-2 max-w-[80%] ${
                message.type === "user" ? "bg-primary/10" : "bg-secondary/10"
              }`}>
                <p className="text-sm">{message.content}</p>
                <div className="text-xs text-muted-foreground mt-1">
                  {message.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </div>
              </Card>
              
              {message.type === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
        <Textarea
          placeholder="Écrivez un message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="resize-none flex-1"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
