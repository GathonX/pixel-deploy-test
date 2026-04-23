
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface AssistantCreatorProps {
  onCancel: () => void;
  onSuccess: (assistantId: string) => void;
}

interface FormValues {
  name: string;
  description: string;
  icon: string;
  personality: string;
  expertise: string[];
}

export function AssistantCreator({ onCancel, onSuccess }: AssistantCreatorProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({
    defaultValues: {
      name: "",
      description: "",
      icon: "🤖",
      personality: "helpful",
      expertise: []
    },
  });
  const { toast } = useToast();

  const iconOptions = ["🤖", "✨", "📊", "✍️", "🎯", "📱", "🎨", "💼", "📈", "🔍"];
  
  const personalityOptions = [
    { value: "helpful", label: "Serviable et amical" },
    { value: "professional", label: "Professionnel" },
    { value: "creative", label: "Créatif" },
    { value: "analytical", label: "Analytique" },
  ];

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    
    try {
      console.log("Creating assistant with values:", values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Mock successful creation with a random ID
      const newAssistantId = `custom-${Date.now()}`;
      
      toast({
        title: "Assistant créé",
        description: "Votre assistant a été créé avec succès.",
      });
      
      onSuccess(newAssistantId);
    } catch (error) {
      console.error("Error creating assistant:", error);
      toast({
        title: "Erreur",
        description: "Une erreur s'est produite lors de la création de l'assistant.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" /> Créer un nouvel assistant
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de l'assistant</FormLabel>
                    <FormControl>
                      <Input placeholder="Mon Assistant" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Icône</FormLabel>
                    <div className="grid grid-cols-5 gap-2">
                      {iconOptions.map((icon) => (
                        <Button
                          key={icon}
                          type="button"
                          variant={field.value === icon ? "default" : "outline"}
                          className="text-xl h-10"
                          onClick={() => form.setValue("icon", icon)}
                        >
                          {icon}
                        </Button>
                      ))}
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Décrivez les capacités de votre assistant..."
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Une description claire aidera les utilisateurs à comprendre à quoi sert cet assistant.
                  </FormDescription>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="personality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Personnalité</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez une personnalité" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {personalityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />
            
            <CardFooter className="px-0 pt-4 flex justify-between">
              <Button variant="outline" type="button" onClick={onCancel}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Création en cours..." : "Créer l'assistant"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
