// src/components/tickets/ReplyForm.tsx
import React, { useState, useRef } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageIcon, Send, XCircle, FileText, Paperclip } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { useCreateTicketMessage } from "@/hooks/useCreateTicketMessage";

interface ReplyFormProps {
  ticketId: number;
}

const ReplyForm: React.FC<ReplyFormProps> = ({ ticketId }) => {
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { mutate: sendMessage, isPending } = useCreateTicketMessage(ticketId);

  // ✅ Fonction pour déterminer si c'est une image
  const isImageFile = (file: File): boolean => {
    return file.type.startsWith("image/");
  };

  // ✅ Gestion de tous types de fichiers (identique à l'admin)
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

  const onSend = () => {
    if (!text.trim() && !attachment) {
      return toast({
        title: "Erreur",
        description: "Message ou fichier requis",
        variant: "destructive",
      });
    }

    const fd = new FormData();
    fd.append("text", text);

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
        setText("");
        setAttachment(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = "";
        toast({ title: "Envoyé", description: "Message posté." });
      },
      onError: (err) => {
        toast({
          title: "Erreur serveur",
          description: err.message,
          variant: "destructive",
        });
      },
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
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <div className="text-xs text-gray-500 mt-1">
        Entrée pour envoyer, Shift+Entrée pour saut de ligne.
      </div>

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {/* ✅ Input acceptant tous types de fichiers */}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
            onChange={handleFile}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileRef.current?.click()}
          >
            <Paperclip className="h-4 w-4" />
            Joindre un fichier
          </Button>

          {/* ✅ Affichage du fichier joint (identique à l'admin) */}
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
          onClick={onSend}
          disabled={isPending || ticketId <= 0}
        >
          {isPending ? (
            <span className="flex items-center gap-1">
              <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              Envoi…
            </span>
          ) : (
            <>
              <Send className="h-4 w-4 mr-1" /> Envoyer
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default ReplyForm;
