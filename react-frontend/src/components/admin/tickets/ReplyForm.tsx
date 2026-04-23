import React, { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon, Send, XCircle, FileText, Paperclip, File, ChevronDown } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useCreateAdminTicketMessage } from "@/hooks/useCreateAdminTicketMessage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Props {
  ticketId: number;
}

interface TicketTemplate {
  id: number;
  name: string;
  category: string | null;
  content: string;
  usage_count: number;
}

const ReplyForm: React.FC<Props> = ({ ticketId }) => {
  const [replyText, setReplyText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TicketTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutate: sendMessage, isPending } =
    useCreateAdminTicketMessage(ticketId);

  // ✅ Charger les templates au montage du composant
  useEffect(() => {
    const fetchTemplates = async () => {
      setTemplatesLoading(true);
      try {
        const response = await fetch('/api/admin/tickets/templates', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setTemplates(data);
        }
      } catch (error) {
        console.error('Erreur chargement templates:', error);
      } finally {
        setTemplatesLoading(false);
      }
    };

    fetchTemplates();
  }, []);

  // ✅ Fonction pour utiliser un template
  const useTemplate = async (template: TicketTemplate) => {
    setReplyText(template.content);
    
    // Marquer le template comme utilisé
    try {
      await fetch(`/api/admin/tickets/templates/${template.id}/use`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });
    } catch (error) {
      console.error('Erreur marquage template:', error);
    }
    
    toast({
      title: "Template appliqué",
      description: `Template "${template.name}" inséré dans la réponse.`,
    });
  };

  // ✅ Fonction pour déterminer si c'est une image
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  // ✅ Gestion de tous types de fichiers
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ✅ Validation taille (5MB max)
    if (file.size > 5_000_000) {
      toast({
        title: "Erreur",
        description: "Fichier trop volumineux (max 5 Mo)",
        variant: "destructive",
      });
      return;
    }

    // ✅ Types autorisés
    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
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
        description: "Formats acceptés: images, PDF, DOC, TXT, ZIP",
        variant: "destructive",
      });
      return;
    }

    setAttachment(file);

    // ✅ Prévisualisation uniquement pour les images
    if (isImageFile(file)) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null); // Pas de prévisualisation pour les autres fichiers
    }
  };

  const handleSend = () => {
    if (!replyText.trim() && !attachment) {
      toast({
        title: "Erreur",
        description: "Message ou fichier requis",
        variant: "destructive",
      });
      return;
    }

    const fd = new FormData();
    fd.append("text", replyText);
    if (attachment) {
      // ✅ Utiliser le bon nom selon le type
      if (isImageFile(attachment)) {
        fd.append("image", attachment);
      } else {
        fd.append("file", attachment); // Pour les autres types de fichiers
      }
    }

    sendMessage(fd, {
      onSuccess: () => {
        setReplyText("");
        setAttachment(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        toast({ title: "Envoyé", description: "Votre message est parti." });
      },
      onError: (err) =>
        toast({
          title: "Erreur",
          description: err.message,
          variant: "destructive",
        }),
    });
  };

  const removeAttachment = () => {
    setAttachment(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="mt-4 border-t pt-4">
      <Textarea
        placeholder="Écrivez votre réponse…"
        className="resize-none"
        value={replyText}
        onChange={(e) => setReplyText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
      />

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {/* ✅ Input acceptant tous types de fichiers */}
          <input
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
            ref={fileRef}
            className="hidden"
            onChange={handleFile}
          />

          <Button
            size="sm"
            variant="outline"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1"
          >
            <Paperclip className="h-4 w-4" />
            Joindre un fichier
          </Button>

          {/* ✅ Dropdown Templates */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                disabled={templatesLoading}
                className="flex items-center gap-1"
              >
                <File className="h-4 w-4" />
                Templates
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-80">
              {templatesLoading ? (
                <DropdownMenuItem disabled>
                  Chargement des templates...
                </DropdownMenuItem>
              ) : templates.length === 0 ? (
                <DropdownMenuItem disabled>
                  Aucun template disponible
                </DropdownMenuItem>
              ) : (
                <>
                  <div className="px-2 py-1 text-xs font-medium text-gray-500">
                    Réponses prédéfinies
                  </div>
                  <DropdownMenuSeparator />
                  {templates.map((template) => (
                    <DropdownMenuItem
                      key={template.id}
                      onClick={() => useTemplate(template)}
                      className="flex-col items-start p-3 cursor-pointer"
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium text-sm">
                          {template.name}
                        </span>
                        {template.category && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {template.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {template.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                        <span>Utilisé {template.usage_count} fois</span>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* ✅ Affichage du fichier joint */}
          {attachment && (
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
              {preview ? (
                // ✅ Prévisualisation image
                <div className="relative">
                  <img
                    src={preview}
                    className="h-8 w-8 object-cover rounded-md"
                    alt="Aperçu"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="absolute -top-2 -right-2 h-5 w-5 p-0"
                    onClick={removeAttachment}
                  >
                    <XCircle className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              ) : (
                // ✅ Icône pour autres fichiers
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-500" />
                  <span className="text-xs text-gray-600 max-w-24 truncate">
                    {attachment.name}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 p-0"
                    onClick={removeAttachment}
                  >
                    <XCircle className="h-4 w-4 text-gray-500" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={handleSend}
          disabled={isPending}
        >
          {isPending ? (
            <span className="animate-spin block h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" />
              Répondre
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ReplyForm;
