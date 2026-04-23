
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssistantChat } from "./AssistantChat";
import { AssistantsList } from "./AssistantsList";
import { AssistantCreator } from "./AssistantCreator";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export function AssistantDashboard() {
  const [activeTab, setActiveTab] = useState("chat");
  const [showCreator, setShowCreator] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>("default");
  
  const handleSelectAssistant = (id: string) => {
    setSelectedAssistantId(id);
    setActiveTab("chat");
  };
  
  const handleCreateSuccess = (newAssistantId: string) => {
    setSelectedAssistantId(newAssistantId);
    setShowCreator(false);
    setActiveTab("chat");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Assistants IA</h1>
        <Button onClick={() => setShowCreator(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" /> Créer un assistant
        </Button>
      </div>

      {showCreator ? (
        <AssistantCreator 
          onCancel={() => setShowCreator(false)}
          onSuccess={handleCreateSuccess}
        />
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="chat">Conversation</TabsTrigger>
            <TabsTrigger value="assistants">Mes Assistants</TabsTrigger>
          </TabsList>
          
          <TabsContent value="chat" className="mt-6">
            <AssistantChat assistantId={selectedAssistantId} />
          </TabsContent>
          
          <TabsContent value="assistants" className="mt-6">
            <AssistantsList 
              onSelectAssistant={handleSelectAssistant}
              selectedAssistantId={selectedAssistantId}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
