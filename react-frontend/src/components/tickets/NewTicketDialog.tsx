// src/components/tickets/NewTicketDialog.tsx
import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { TicketPlus, Upload, XCircle, FileText, HelpCircle, ChevronDown, ChevronUp, CheckCircle } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import type { UseMutateFunction } from "@tanstack/react-query";
import type { Ticket } from "@/models/Ticket";

interface NewTicketDialogProps {
  newTicketOpen: boolean;
  setNewTicketOpen: (open: boolean) => void;
  newTicket: { title: string; description: string; category: string };
  setNewTicket: (ticket: {
    title: string;
    description: string;
    category: string;
  }) => void;
  newTicketImage: File | null;
  setNewTicketImage: (file: File | null) => void;
  newTicketImagePreview: string | null;
  setNewTicketImagePreview: (preview: string | null) => void;
  newTicketFileInputRef: React.RefObject<HTMLInputElement>;

  // on injecte la mutation et son état depuis le parent
  createTicket: UseMutateFunction<Ticket, Error, FormData, unknown>;
  isCreating: boolean;
}

// ✅ FAQ inline component pour éviter un nouveau fichier
interface FAQItem {
  id: number;
  question: string;
  answer: string;
  category: string;
  helpful_count: number;
}

const FAQSuggestions: React.FC<{ 
  searchTerm: string; 
  category: string;
  onSolutionFound: () => void;
}> = ({ searchTerm, category, onSolutionFound }) => {
  const [faqs, setFaqs] = React.useState<FAQItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [expandedFaq, setExpandedFaq] = React.useState<number | null>(null);

  // ✅ FAQ prédéfinies par catégorie
  const defaultFAQs: Record<string, FAQItem[]> = {
    "Authentification": [
      {
        id: 1,
        question: "Je n'arrive pas à me connecter à mon compte",
        answer: "1. Vérifiez que vous utilisez la bonne adresse email\n2. Essayez de réinitialiser votre mot de passe\n3. Videz le cache de votre navigateur\n4. Si le problème persiste, contactez-nous avec votre adresse email.",
        category: "Authentification",
        helpful_count: 127
      },
      {
        id: 2,
        question: "Je n'ai pas reçu l'email de réinitialisation",
        answer: "1. Vérifiez votre dossier spam/courrier indésirable\n2. Attendez jusqu'à 10 minutes (délai de livraison)\n3. Vérifiez que l'adresse email est correcte\n4. Réessayez la réinitialisation\n5. Contactez le support si le problème persiste.",
        category: "Authentification",
        helpful_count: 89
      }
    ],
    "Facturation": [
      {
        id: 3,
        question: "Comment puis-je télécharger ma facture ?",
        answer: "1. Connectez-vous à votre espace client\n2. Allez dans 'Mon Compte' > 'Facturation'\n3. Cliquez sur 'Télécharger' à côté de la facture souhaitée\n4. La facture sera téléchargée en PDF",
        category: "Facturation",
        helpful_count: 156
      },
      {
        id: 4,
        question: "Erreur lors du paiement de ma commande",
        answer: "1. Vérifiez les informations de votre carte bancaire\n2. Assurez-vous d'avoir suffisamment de fonds\n3. Contactez votre banque pour vérifier les autorisations\n4. Essayez avec un autre moyen de paiement\n5. Contactez-nous si le problème persiste.",
        category: "Facturation",
        helpful_count: 94
      }
    ],
    "Fonctionnalité": [
      {
        id: 5,
        question: "Comment activer une nouvelle fonctionnalité ?",
        answer: "1. Rendez-vous dans 'Fonctionnalités' depuis votre tableau de bord\n2. Trouvez la fonctionnalité souhaitée\n3. Cliquez sur 'Activer' et suivez les instructions\n4. La fonctionnalité sera disponible immédiatement après activation",
        category: "Fonctionnalité",
        helpful_count: 203
      }
    ],
    "Bug": [
      {
        id: 6,
        question: "L'interface se charge lentement",
        answer: "1. Rafraîchissez la page (Ctrl+F5 ou Cmd+Shift+R)\n2. Videz le cache de votre navigateur\n3. Désactivez temporairement les extensions\n4. Vérifiez votre connexion internet\n5. Essayez avec un autre navigateur",
        category: "Bug",
        helpful_count: 78
      }
    ]
  };

  React.useEffect(() => {
    setLoading(true);
    
    // ✅ Simulation API call avec données locales
    setTimeout(() => {
      let suggestions = defaultFAQs[category] || defaultFAQs["Autre"] || [];
      
      // ✅ Filtrage par terme de recherche
      if (searchTerm.length > 2) {
        suggestions = Object.values(defaultFAQs).flat().filter(faq =>
          faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setFaqs(suggestions.slice(0, 3)); // Limiter à 3 suggestions
      setLoading(false);
    }, 300);
  }, [searchTerm, category]);

  if (!searchTerm && !category) return null;

  return (
    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="h-5 w-5 text-blue-600" />
        <h3 className="font-medium text-blue-800">Ces réponses peuvent vous aider</h3>
      </div>
      
      {loading ? (
        <div className="text-center py-4 text-gray-500">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
          Recherche de solutions...
        </div>
      ) : faqs.length === 0 ? (
        <p className="text-sm text-blue-700">
          Aucune solution trouvée. Notre équipe vous aidera via un ticket de support.
        </p>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq) => (
            <div key={faq.id} className="bg-white rounded-lg border border-blue-200">
              <button
                onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                className="w-full p-3 text-left flex items-center justify-between hover:bg-gray-50"
              >
                <span className="font-medium text-sm">{faq.question}</span>
                {expandedFaq === faq.id ? 
                  <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                }
              </button>
              
              {expandedFaq === faq.id && (
                <div className="px-3 pb-3">
                  <div className="text-sm text-gray-700 whitespace-pre-line mb-3">
                    {faq.answer}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      👍 {faq.helpful_count} personnes trouvent cela utile
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={onSolutionFound}
                      className="text-xs"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Ça m'a aidé !
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {faqs.length > 0 && (
            <p className="text-xs text-blue-600 mt-3">
              💡 Si aucune de ces solutions ne résout votre problème, continuez la création de votre ticket.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

const NewTicketDialog: React.FC<NewTicketDialogProps> = ({
  newTicketOpen,
  setNewTicketOpen,
  newTicket,
  setNewTicket,
  newTicketImage,
  setNewTicketImage,
  newTicketImagePreview,
  setNewTicketImagePreview,
  newTicketFileInputRef,
  createTicket,
  isCreating,
}) => {
  // ✅ État pour la section FAQ/Suggestions
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = React.useState<string | null>(null);
  // ✅ FAQ/Suggestions basées sur la catégorie et mots-clés
  const getSuggestions = (category: string, title: string, description: string) => {
    const keywords = (title + " " + description).toLowerCase();
    const suggestions: Array<{title: string; content: string; helpful?: boolean}> = [];
    
    // Suggestions par catégorie
    if (category === "Authentification") {
      suggestions.push(
        { title: "Mot de passe oublié", content: "Utilisez le lien 'Mot de passe oublié' sur la page de connexion. Vérifiez vos spams si vous ne recevez pas l'email." },
        { title: "Compte bloqué", content: "Après 5 tentatives incorrectes, votre compte est temporairement bloqué 15 minutes. Contactez-nous si le problème persiste." }
      );
    }
    
    if (category === "Facturation") {
      suggestions.push(
        { title: "Moyens de paiement", content: "Nous acceptons CB, PayPal, et virement bancaire. Les paiements sont sécurisés et traités immédiatement." },
        { title: "Facture non reçue", content: "Vos factures sont envoyées automatiquement par email. Vérifiez vos spams ou téléchargez-les depuis votre espace client." }
      );
    }
    
    if (category === "Fonctionnalité") {
      suggestions.push(
        { title: "Comment activer une fonctionnalité", content: "Rendez-vous dans 'Gestion des Fonctionnalités', sélectionnez celle souhaitée et suivez les étapes d'activation." },
        { title: "Fonctionnalité non disponible", content: "Certaines fonctionnalités nécessitent un abonnement Premium. Vérifiez votre plan dans les paramètres." }
      );
    }
    
    if (category === "Bug") {
      suggestions.push(
        { title: "Vider le cache", content: "Essayez Ctrl+F5 pour actualiser la page. Si le problème persiste, videz le cache de votre navigateur." },
        { title: "Navigateur non supporté", content: "Nous recommandons Chrome, Firefox ou Safari récents. Évitez Internet Explorer." }
      );
    }
    
    // Suggestions par mots-clés
    if (keywords.includes("lent") || keywords.includes("ralenti")) {
      suggestions.push({ title: "Performance", content: "Essayez de vider votre cache navigateur ou utilisez une connexion plus stable." });
    }
    
    if (keywords.includes("erreur") || keywords.includes("error")) {
      suggestions.push({ title: "Code d'erreur", content: "Notez le code d'erreur exact et joignez une capture d'écran pour un diagnostic plus rapide." });
    }
    
    return suggestions.slice(0, 3); // Limiter à 3 suggestions
  };
  
  const currentSuggestions = getSuggestions(newTicket.category, newTicket.title, newTicket.description);
  
  // ✅ FONCTION : Appliquer une suggestion
  const applySuggestion = (suggestion: {title: string; content: string}) => {
    setNewTicket({
      ...newTicket,
      title: newTicket.title || suggestion.title,
      description: newTicket.description + "\n\n" + suggestion.content
    });
    setSelectedSuggestion(suggestion.title);
    toast({
      title: "Suggestion appliquée",
      description: "Le contenu a été ajouté à votre ticket.",
    });
  };

  // ✅ FONCTION : Déterminer si c'est une image
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  const handleCreateTicket = () => {
    if (!newTicket.title || !newTicket.description) {
      toast({
        title: "Erreur",
        description: "Veuillez remplir tous les champs obligatoires",
        variant: "destructive",
      });
      return;
    }

    const fd = new FormData();
    fd.append("title", newTicket.title);
    fd.append("description", newTicket.description);
    fd.append("category", newTicket.category);

    // ✅ CORRECTION : Support images ET autres fichiers
    if (newTicketImage) {
      if (isImageFile(newTicketImage)) {
        fd.append("image", newTicketImage);
        console.log(
          "🖼️ [NewTicketDialog] Image ajoutée:",
          newTicketImage.name,
          newTicketImage.type
        );
      } else {
        fd.append("file", newTicketImage); // Pour PDFs, DOCs, etc.
        console.log(
          "📄 [NewTicketDialog] Fichier ajouté:",
          newTicketImage.name,
          newTicketImage.type
        );
      }
    }

    // ✅ LOG DEBUG : FormData
    console.log("📤 [NewTicketDialog] Envoi FormData:", {
      title: newTicket.title,
      category: newTicket.category,
      hasFile: !!newTicketImage,
      fileName: newTicketImage?.name,
      fileType: newTicketImage?.type,
      fileSize: newTicketImage?.size,
    });

    createTicket(fd, {
      onSuccess: () => {
        toast({
          title: "Ticket créé",
          description: "Votre ticket a bien été enregistré.",
        });
        setNewTicketOpen(false);
        setNewTicket({
          title: "",
          description: "",
          category: "Authentification",
        });
        setNewTicketImage(null);
        setNewTicketImagePreview(null);
        // ✅ Réinitialiser les nouveaux états
        setShowSuggestions(false);
        setSelectedSuggestion(null);
      },
      onError: (err: unknown) => {
        const error = err instanceof Error ? err : new Error("Erreur inconnue");
        console.error("❌ [NewTicketDialog] Erreur création:", error);
        toast({
          title: "Erreur serveur",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    console.log("📂 [NewTicketDialog] Fichier sélectionné:", {
      name: file.name,
      type: file.type,
      size: file.size,
      isImage: isImageFile(file),
    });

    // ✅ VALIDATION ÉTENDUE : Images + PDFs + Documents
    const allowedTypes = [
      // Images
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "text/plain",
      "application/zip",
      "application/x-rar-compressed",
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Format non supporté",
        description:
          "Formats acceptés: Images (JPG, PNG, GIF), Documents (PDF, DOC, TXT, ZIP)",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Fichier trop volumineux",
        description: "Le fichier ne doit pas dépasser 5Mo",
        variant: "destructive",
      });
      return;
    }

    setNewTicketImage(file);

    // ✅ PRÉVISUALISATION : Uniquement pour les images
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onloadend = () =>
        setNewTicketImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setNewTicketImagePreview(null); // Pas de prévisualisation pour les autres fichiers
    }
  };

  const clearNewTicketImage = () => {
    setNewTicketImage(null);
    setNewTicketImagePreview(null);
    if (newTicketFileInputRef.current) newTicketFileInputRef.current.value = "";
  };

  return (
    <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700">
          <TicketPlus className="h-4 w-4" />
          <span>Nouveau ticket</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau ticket</DialogTitle>
          <DialogDescription>
            Détaillez votre problème et nous vous répondrons dès que possible.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* ✅ Section FAQ/Suggestions */}
          {currentSuggestions.length > 0 && (
            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-blue-700">
                  <HelpCircle className="h-4 w-4" />
                  Suggestions d'aide
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  {showSuggestions ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-1" />
                      Masquer
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-1" />
                      Voir les suggestions ({currentSuggestions.length})
                    </>
                  )}
                </Button>
              </div>
              
              {showSuggestions && (
                <div className="space-y-2 p-3 bg-blue-50 rounded-md border border-blue-200">
                  <p className="text-xs text-blue-700 font-medium">
                    Ces solutions pourraient résoudre votre problème :
                  </p>
                  {currentSuggestions.map((suggestion, index) => (
                    <div
                      key={index}
                      className={`p-3 bg-white rounded border ${
                        selectedSuggestion === suggestion.title 
                          ? "border-green-300 bg-green-50" 
                          : "border-gray-200 hover:border-blue-300"
                      } cursor-pointer transition-all`}
                      onClick={() => applySuggestion(suggestion)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-800 mb-1">
                            {suggestion.title}
                          </h4>
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {suggestion.content}
                          </p>
                        </div>
                        {selectedSuggestion === suggestion.title && (
                          <div className="text-green-600 ml-2">
                            <span className="text-xs">✓ Appliqué</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-gray-500 mt-2">
                    💡 Cliquez sur une suggestion pour l'ajouter à votre ticket
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Sujet */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-title">Sujet</Label>
            <Input
              id="ticket-title"
              value={newTicket.title}
              onChange={(e) =>
                setNewTicket({ ...newTicket, title: e.target.value })
              }
              placeholder="Résumez votre problème en une phrase"
            />
          </div>

          {/* Catégorie */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-category">Catégorie</Label>
            <Select
              value={newTicket.category}
              onValueChange={(v) => setNewTicket({ ...newTicket, category: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez une catégorie" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Bug">
                  <div className="flex items-center justify-between w-full">
                    <span>Bug</span>
                    <span className="text-xs text-red-600 ml-2">⚡ ~4h</span>
                  </div>
                </SelectItem>
                <SelectItem value="Authentification">
                  <div className="flex items-center justify-between w-full">
                    <span>Authentification</span>
                    <span className="text-xs text-orange-600 ml-2">🔒 ~6h</span>
                  </div>
                </SelectItem>
                <SelectItem value="Facturation">
                  <div className="flex items-center justify-between w-full">
                    <span>Facturation</span>
                    <span className="text-xs text-blue-600 ml-2">💰 ~8h</span>
                  </div>
                </SelectItem>
                <SelectItem value="Fonctionnalité">
                  <div className="flex items-center justify-between w-full">
                    <span>Fonctionnalité</span>
                    <span className="text-xs text-gray-600 ml-2">⚙️ ~24h</span>
                  </div>
                </SelectItem>
                <SelectItem value="Autre">
                  <div className="flex items-center justify-between w-full">
                    <span>Autre</span>
                    <span className="text-xs text-gray-500 ml-2">❓ ~48h</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              ⏰ Temps de réponse estimé selon la catégorie sélectionnée
            </p>
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={newTicket.description}
              onChange={(e) =>
                setNewTicket({ ...newTicket, description: e.target.value })
              }
              placeholder="Décrivez votre problème en détail"
              rows={5}
            />
          </div>

          {/* ✅ NOUVEAU : Suggestions FAQ intelligentes */}
          <FAQSuggestions 
            searchTerm={newTicket.title + " " + newTicket.description} 
            category={newTicket.category}
            onSolutionFound={() => {
              toast({
                title: "Super !",
                description: "Ravi que vous ayez trouvé une solution. Ticket annulé.",
              });
              setNewTicketOpen(false);
            }}
          />

          {/* ✅ FICHIER ÉTENDU : Images + Documents */}
          <div className="grid gap-2">
            <Label htmlFor="ticket-file">Pièce jointe (optionnel)</Label>
            <div className="flex flex-col gap-2">
              <input
                ref={newTicketFileInputRef}
                type="file"
                id="ticket-file"
                accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => newTicketFileInputRef.current?.click()}
                className="flex items-center gap-1"
              >
                <Upload className="h-4 w-4" />
                Joindre un fichier
              </Button>

              {/* ✅ AFFICHAGE FICHIER : Image ou icône document */}
              {newTicketImage && (
                <div className="mt-2 relative">
                  {newTicketImagePreview ? (
                    // Prévisualisation image
                    <img
                      src={newTicketImagePreview}
                      alt="Aperçu du problème"
                      className="max-w-full max-h-64 rounded-md border"
                    />
                  ) : (
                    // Icône pour autres fichiers
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                      <FileText className="h-8 w-8 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {newTicketImage.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(newTicketImage.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  )}
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0"
                    onClick={clearNewTicketImage}
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formats supportés: Images (JPG, PNG, GIF), Documents (PDF, DOC,
              TXT, ZIP) - Max 5 MB
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setNewTicketOpen(false);
              setNewTicketImage(null);
              setNewTicketImagePreview(null);
              // ✅ Réinitialiser les nouveaux états
              setShowSuggestions(false);
              setSelectedSuggestion(null);
            }}
          >
            Annuler
          </Button>
          <Button
            onClick={handleCreateTicket}
            className="bg-indigo-600 hover:bg-indigo-700"
            disabled={isCreating}
          >
            {isCreating ? "Création…" : "Créer le ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewTicketDialog;
