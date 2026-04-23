
import React, { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "@/hooks/use-toast";
import { AlertCircle, Box, Calendar, Edit, Trash, Plus, RefreshCw, Clock, BadgeCheck, XCircle } from "lucide-react";

// Sample data - dans une vraie application, ces données proviendraient d'une base de données
const aiRulesData = [
  {
    id: 1,
    name: "Article de blog hebdomadaire",
    type: "Article de blog",
    frequency: "Hebdomadaire",
    target: "Tous les utilisateurs",
    language: "Français",
    model: "GPT-4",
    active: true,
    lastRun: "2025-04-05 14:30",
    nextRun: "2025-04-12 14:30",
  },
  {
    id: 2,
    name: "Post Instagram quotidien",
    type: "Post réseaux sociaux",
    frequency: "Quotidien",
    target: "Utilisateurs Premium",
    language: "Français",
    model: "GPT-4",
    active: true,
    lastRun: "2025-04-07 09:00",
    nextRun: "2025-04-08 09:00",
  },
  {
    id: 3,
    name: "Newsletter mensuelle",
    type: "Newsletter",
    frequency: "Mensuel",
    target: "Tous les utilisateurs",
    language: "Français",
    model: "GPT-3.5",
    active: false,
    lastRun: "2025-03-01 10:00",
    nextRun: "2025-05-01 10:00",
  }
];

const generatedContentData = [
  {
    id: 1,
    ruleName: "Article de blog hebdomadaire",
    date: "2025-04-05 14:30",
    type: "Article de blog",
    status: "success",
    model: "GPT-4",
    target: "Tous les utilisateurs",
  },
  {
    id: 2,
    ruleName: "Post Instagram quotidien",
    date: "2025-04-07 09:00",
    type: "Post réseaux sociaux",
    status: "success",
    model: "GPT-4",
    target: "Utilisateurs Premium",
  },
  {
    id: 3,
    ruleName: "Newsletter mensuelle",
    date: "2025-03-01 10:00",
    type: "Newsletter",
    status: "error",
    model: "GPT-3.5",
    target: "Tous les utilisateurs",
    error: "Erreur API: Limite de quota dépassée"
  }
];

// Définition du schéma pour le formulaire d'ajout de règle
const aiRuleSchema = z.object({
  name: z.string().min(3, {
    message: "Le nom doit contenir au moins 3 caractères",
  }),
  type: z.string({
    required_error: "Veuillez sélectionner un type de contenu",
  }),
  frequency: z.string({
    required_error: "Veuillez sélectionner une fréquence",
  }),
  prompt: z.string().min(10, {
    message: "Le prompt doit contenir au moins 10 caractères",
  }),
  model: z.string({
    required_error: "Veuillez sélectionner un modèle IA",
  }),
  language: z.string({
    required_error: "Veuillez sélectionner une langue",
  }),
  target: z.string({
    required_error: "Veuillez sélectionner une cible",
  }),
  active: z.boolean().default(true),
});

type AIRuleFormValues = z.infer<typeof aiRuleSchema>;

const AdminAIConfig = () => {
  const [apiKey, setApiKey] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [currentRule, setCurrentRule] = useState<AIRuleFormValues | null>(null);

  // Configuration du formulaire
  const form = useForm<AIRuleFormValues>({
    resolver: zodResolver(aiRuleSchema),
    defaultValues: {
      name: "",
      type: "",
      frequency: "",
      prompt: "",
      model: "",
      language: "",
      target: "",
      active: true,
    },
  });

  // Handler pour la soumission du formulaire
  function onSubmit(values: AIRuleFormValues) {
    console.log(values);
    toast({
      title: editMode ? "Règle mise à jour" : "Règle ajoutée",
      description: `La règle "${values.name}" a été ${editMode ? 'mise à jour' : 'ajoutée'} avec succès.`,
    });
    form.reset();
    setEditMode(false);
  }

  // Handler pour l'enregistrement de la clé API
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      toast({
        title: "Clé API enregistrée",
        description: "La clé API OpenAI a été enregistrée avec succès.",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Veuillez entrer une clé API valide.",
        variant: "destructive",
      });
    }
  };

  // Handler pour éditer une règle existante
  const handleEditRule = (rule: any) => {
    setEditMode(true);
    form.reset({
      name: rule.name,
      type: rule.type,
      frequency: rule.frequency,
      prompt: "Créer un article de blog sur {sujet} adapté pour {cible} avec un ton {tonalité}.",
      model: rule.model,
      language: rule.language,
      target: rule.target,
      active: rule.active,
    });
    setCurrentRule(rule);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handler pour supprimer une règle
  const handleDeleteRule = (id: number) => {
    console.log("Supprimer la règle", id);
    toast({
      title: "Règle supprimée",
      description: "La règle a été supprimée avec succès.",
    });
  };

  // Handler pour exécuter une règle manuellement
  const handleRunRule = (id: number) => {
    console.log("Exécuter la règle", id);
    toast({
      title: "Génération IA démarrée",
      description: "La règle est en cours d'exécution. Les résultats seront bientôt disponibles.",
    });
  };

  return (
    <AdminLayout>
      <div className="p-6">
        <h1 className="text-3xl font-bold mb-1">Configuration IA Automatisée</h1>
        <p className="text-muted-foreground mb-6">
          Centralisez et planifiez la génération automatique de contenu IA pour vos utilisateurs
        </p>

        <Tabs defaultValue="rules" className="space-y-4">
          <TabsList>
            <TabsTrigger value="rules">Règles de génération</TabsTrigger>
            <TabsTrigger value="history">Historique de génération</TabsTrigger>
            <TabsTrigger value="settings">Configuration</TabsTrigger>
          </TabsList>

          {/* Onglet Règles de génération */}
          <TabsContent value="rules" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{editMode ? "Modifier une règle" : "Ajouter une règle de génération IA"}</CardTitle>
                <CardDescription>
                  {editMode 
                    ? "Modifiez les détails de la règle de génération IA existante" 
                    : "Définissez quand et comment l'IA génèrera automatiquement du contenu"
                  }
                </CardDescription>
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
                            <FormLabel>Nom de la règle</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Article de blog hebdomadaire" {...field} />
                            </FormControl>
                            <FormDescription>
                              Nom unique pour identifier cette règle de génération
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type de contenu</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Article de blog">Article de blog</SelectItem>
                                <SelectItem value="Post réseaux sociaux">Post réseaux sociaux</SelectItem>
                                <SelectItem value="Newsletter">Newsletter</SelectItem>
                                <SelectItem value="Description de produit">Description de produit</SelectItem>
                                <SelectItem value="Email marketing">Email marketing</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Le type de contenu que l'IA va générer
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="frequency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fréquence de génération</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une fréquence" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Quotidien">Quotidien</SelectItem>
                                <SelectItem value="Hebdomadaire">Hebdomadaire</SelectItem>
                                <SelectItem value="Mensuel">Mensuel</SelectItem>
                                <SelectItem value="Personnalisé">Personnalisé</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              À quelle fréquence l'IA générera du contenu
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="model"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Modèle IA</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner un modèle" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="GPT-4o">GPT-4o</SelectItem>
                                <SelectItem value="GPT-4">GPT-4</SelectItem>
                                <SelectItem value="GPT-3.5">GPT-3.5</SelectItem>
                                <SelectItem value="Claude 3 Opus">Claude 3 Opus</SelectItem>
                                <SelectItem value="Claude 3 Sonnet">Claude 3 Sonnet</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Le modèle d'IA à utiliser pour la génération
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Langue / Tonalité</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une langue" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Français">Français - Formel</SelectItem>
                                <SelectItem value="Français - Décontracté">Français - Décontracté</SelectItem>
                                <SelectItem value="Français - Professionnel">Français - Professionnel</SelectItem>
                                <SelectItem value="Anglais">Anglais - Formel</SelectItem>
                                <SelectItem value="Anglais - Décontracté">Anglais - Décontracté</SelectItem>
                                <SelectItem value="Espagnol">Espagnol</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Langue et tonalité du contenu généré
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="target"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cible</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Sélectionner une cible" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="Tous les utilisateurs">Tous les utilisateurs</SelectItem>
                                <SelectItem value="Utilisateurs Gratuit">Utilisateurs Gratuit</SelectItem>
                                <SelectItem value="Utilisateurs Standard">Utilisateurs Standard</SelectItem>
                                <SelectItem value="Utilisateurs Premium">Utilisateurs Premium</SelectItem>
                                <SelectItem value="Administrateurs">Administrateurs</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Pour quels utilisateurs générer ce contenu
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="prompt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prompt de génération</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ex: Créer un article de blog sur {sujet} adapté pour {cible} avec un ton {tonalité}."
                              className="min-h-[120px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Définissez le prompt avec des variables entre accolades {"{variable}"} qui seront remplies dynamiquement
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="active"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Activer cette règle</FormLabel>
                            <FormDescription>
                              Lorsque activée, cette règle générera du contenu selon la fréquence définie
                            </FormDescription>
                          </div>
                          <FormControl>
                            <input
                              type="checkbox"
                              checked={field.value}
                              onChange={field.onChange}
                              className="h-4 w-4"
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    
                    <div className="flex justify-end space-x-2">
                      {editMode && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setEditMode(false);
                            form.reset();
                          }}
                        >
                          Annuler
                        </Button>
                      )}
                      <Button type="submit">
                        {editMode ? "Mettre à jour la règle" : "Ajouter la règle"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Règles de génération IA existantes</CardTitle>
                <CardDescription>
                  Liste de toutes les règles configurées pour la génération automatique de contenu
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Fréquence</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Modèle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Prochaine exécution</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {aiRulesData.map((rule) => (
                      <TableRow key={rule.id}>
                        <TableCell className="font-medium">{rule.name}</TableCell>
                        <TableCell>{rule.type}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            {rule.frequency}
                          </div>
                        </TableCell>
                        <TableCell>{rule.target}</TableCell>
                        <TableCell>{rule.model}</TableCell>
                        <TableCell>
                          {rule.active ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700">Actif</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-50 text-gray-700">Inactif</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {rule.nextRun}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditRule(rule)}
                              title="Modifier"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleRunRule(rule.id)}
                              title="Exécuter maintenant"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteRule(rule.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Supprimer"
                            >
                              <Trash className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Historique de génération */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historique des contenus générés</CardTitle>
                <CardDescription>
                  Suivi de tous les contenus générés automatiquement par les règles d'IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 flex items-center gap-2">
                  <Input placeholder="Rechercher..." className="max-w-xs" />
                  <Select defaultValue="all">
                    <SelectTrigger className="max-w-xs">
                      <SelectValue placeholder="Tous les statuts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tous les statuts</SelectItem>
                      <SelectItem value="success">Succès</SelectItem>
                      <SelectItem value="error">Erreur</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Règle</TableHead>
                      <TableHead>Type de contenu</TableHead>
                      <TableHead>Modèle IA</TableHead>
                      <TableHead>Cible</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {generatedContentData.map((content) => (
                      <TableRow key={content.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {content.date}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{content.ruleName}</TableCell>
                        <TableCell>{content.type}</TableCell>
                        <TableCell>{content.model}</TableCell>
                        <TableCell>{content.target}</TableCell>
                        <TableCell>
                          {content.status === "success" ? (
                            <div className="flex items-center text-green-600">
                              <BadgeCheck className="h-4 w-4 mr-1" />
                              <span>Succès</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-red-600">
                              <XCircle className="h-4 w-4 mr-1" />
                              <span>Erreur</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">Voir détails</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="mt-4 flex items-center justify-end space-x-2">
                  <Button variant="outline" size="sm" disabled>
                    Précédent
                  </Button>
                  <Button variant="outline" size="sm">
                    1
                  </Button>
                  <Button variant="outline" size="sm">
                    2
                  </Button>
                  <Button variant="outline" size="sm">
                    Suivant
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Onglet Configuration */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration de l'API IA</CardTitle>
                <CardDescription>
                  Paramétrez votre clé API pour la génération de contenu IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="api-key">Clé API OpenAI</Label>
                    <Input
                      id="api-key"
                      type="password"
                      placeholder="sk-..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                    />
                    <p className="text-sm text-muted-foreground">
                      Cette clé sera utilisée pour toutes les générations automatiques de contenu
                    </p>
                  </div>
                  
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="limit-tokens">Limite de tokens par requête</Label>
                      <Input
                        id="limit-tokens"
                        type="number"
                        defaultValue="4000"
                        className="w-28"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Définit la limite maximale de tokens pour chaque génération
                    </p>
                  </div>
                  
                  <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 mr-3" />
                      <div>
                        <h3 className="text-sm font-medium text-amber-800">
                          Informations sur la facturation
                        </h3>
                        <div className="mt-1 text-sm text-amber-700">
                          <p>
                            L'utilisation de l'API OpenAI est facturée selon les tarifs en vigueur.
                            Assurez-vous de configurer des limites appropriées pour contrôler vos coûts.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveApiKey}>
                    Enregistrer la configuration
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Limites par plan</CardTitle>
                <CardDescription>
                  Configurez les limites de génération IA selon les différents plans d'abonnement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Contenu par mois</TableHead>
                      <TableHead>Types de contenu autorisés</TableHead>
                      <TableHead>Modèles disponibles</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium">Gratuit</TableCell>
                      <TableCell>5</TableCell>
                      <TableCell>Post réseaux sociaux</TableCell>
                      <TableCell>GPT-3.5</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Modifier</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Standard</TableCell>
                      <TableCell>20</TableCell>
                      <TableCell>Post RS, Articles courts</TableCell>
                      <TableCell>GPT-3.5, GPT-4</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Modifier</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium">Premium</TableCell>
                      <TableCell>Illimité</TableCell>
                      <TableCell>Tous</TableCell>
                      <TableCell>Tous</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">Modifier</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminAIConfig;
