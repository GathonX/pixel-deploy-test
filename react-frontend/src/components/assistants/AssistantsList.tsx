
import { Button } from "@/components/ui/button";
import { Bot, CheckCircle, PenSquare, Trash2 } from "lucide-react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

// Mock data for assistants - replace with real data from API/database
const mockAssistants = [
  {
    id: "default",
    name: "Assistant PixelRise",
    description: "Assistant par défaut pour vous aider avec PixelRise",
    isDefault: true,
    icon: "✨"
  },
  {
    id: "business",
    name: "Business Plan Expert",
    description: "Spécialisé dans la création de business plans",
    isDefault: false,
    icon: "📊"
  },
  {
    id: "writer",
    name: "Rédacteur de Blog",
    description: "Aide à la rédaction et à l'édition de contenu pour vos blogs",
    isDefault: false,
    icon: "✍️"
  }
];

interface AssistantsListProps {
  onSelectAssistant: (id: string) => void;
  selectedAssistantId: string | null;
}

export function AssistantsList({ onSelectAssistant, selectedAssistantId }: AssistantsListProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {mockAssistants.map((assistant) => (
          <Card key={assistant.id} className="overflow-hidden">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="text-3xl mb-4">{assistant.icon}</div>
                {selectedAssistantId === assistant.id && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>
              <div className="space-y-2">
                <h3 className="font-bold">{assistant.name}</h3>
                <p className="text-sm text-muted-foreground">{assistant.description}</p>
              </div>
            </CardContent>
            <CardFooter className="bg-muted/50 p-4 gap-2 flex">
              <Button 
                variant="default" 
                className="flex-1" 
                size="sm"
                onClick={() => onSelectAssistant(assistant.id)}
              >
                <Bot className="h-4 w-4 mr-1" /> Utiliser
              </Button>
              {!assistant.isDefault && (
                <>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <PenSquare className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
