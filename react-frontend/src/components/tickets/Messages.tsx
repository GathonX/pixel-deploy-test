// src/components/tickets/Messages.tsx
import React, { useState } from "react";
import { TicketMessage } from "@/models/TicketMessage";
import {
  User,
  Shield,
  FileText,
  Download,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface MessagesProps {
  messages: TicketMessage[];
  status: "open" | "pending" | "resolved";
}

const Messages: React.FC<MessagesProps> = ({ messages, status }) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);

  // ✅ FONCTION : Déterminer le type de fichier depuis l'URL
  const getFileType = (
    url: string
  ): { type: "image" | "file"; extension: string; filename: string } => {
    const filename = url.split("/").pop() || "fichier";
    const extension = filename.split(".").pop()?.toLowerCase() || "";
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];

    return {
      type: imageExtensions.includes(extension) ? "image" : "file",
      extension,
      filename,
    };
  };

  // ✅ Fonction pour extraire les URLs de fichiers du texte
  const extractFileUrls = (
    text: string
  ): Array<{ url: string; type: "image" | "file"; filename: string }> => {
    const urlRegex =
      /https?:\/\/[^\s]+\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|txt|zip|rar)/gi;
    const matches = text.match(urlRegex) || [];

    return matches.map((url) => {
      const { type, filename } = getFileType(url);
      return { url, type, filename };
    });
  };

  // ✅ Fonction pour supprimer les URLs du texte
  const removeUrlsFromText = (text: string): string => {
    const urlRegex =
      /https?:\/\/[^\s]+\.(pdf|jpg|jpeg|png|gif|webp|doc|docx|txt|zip|rar)/gi;
    return text
      .replace(urlRegex, "")
      .replace(/\n\s*\n/g, "\n")
      .trim();
  };

  // ✅ PROTECTION : Vérifier que messages existe et n'est pas vide
  if (!messages || !messages.length) {
    return (
      <div className="py-8 text-center text-gray-500">
        Aucune discussion pour ce ticket.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {messages.map((message) => {
          const isUser = message.sender === "user";
          const isAdmin = message.sender === "admin";
          const fileUrls = extractFileUrls(message.text);
          const cleanText = removeUrlsFromText(message.text);

          // ✅ DÉTECTION : Type de fichier principal (image_url)
          const mainFile = message.image_url
            ? getFileType(message.image_url)
            : null;

          return (
            <div
              key={message.id}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`flex items-start gap-3 max-w-[70%] ${
                  isUser ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* ✅ Avatar Professionnel */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                    isUser
                      ? "bg-gradient-to-br from-indigo-500 to-indigo-700 text-white ring-2 ring-indigo-200"
                      : "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white ring-2 ring-emerald-200"
                  }`}
                >
                  {isUser ? (
                    <User className="w-5 h-5" />
                  ) : (
                    <Shield className="w-5 h-5" />
                  )}
                </div>

                {/* ✅ Message Content Professionnel */}
                <div
                  className={`rounded-2xl p-4 shadow-sm ${
                    isUser
                      ? "bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-br-md"
                      : "bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-md"
                  }`}
                >
                  {/* ✅ Sender Label Professionnel */}
                  <div
                    className={`flex items-center justify-between mb-2`}
                  >
                    <div className={`text-xs font-semibold ${
                      isUser ? "text-indigo-100" : "text-emerald-600"
                    }`}>
                      {isUser ? "Vous" : "🎯 Support PixelRise"}
                    </div>
                    <div className={`text-xs ${
                      isUser ? "text-indigo-200" : "text-gray-400"
                    }`}>
                      {new Date(message.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* ✅ Message Text Professionnel */}
                  {cleanText && (
                    <p className={`whitespace-pre-wrap leading-relaxed ${
                      isUser ? "text-white" : "text-gray-700"
                    }`}>
                      {cleanText}
                    </p>
                  )}

                  {/* ✅ CORRECTION CRITIQUE : Fichier principal (image_url) */}
                  {message.image_url && mainFile && (
                    <div className="mt-2">
                      {mainFile.type === "image" ? (
                        // ✅ Image : Affichage normal
                        <img
                          src={message.image_url}
                          alt="Pièce jointe"
                          onClick={() => setPreviewSrc(message.image_url!)}
                          className="max-w-full rounded-md cursor-pointer border hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        // ✅ Fichier non-image : Affichage sous forme de lien
                        <div className="flex items-center gap-2 p-3 bg-white/10 rounded border">
                          <FileText className="w-6 h-6" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {mainFile.filename}
                            </p>
                            <p className="text-xs opacity-75">
                              Fichier {mainFile.extension.toUpperCase()}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                window.open(message.image_url, "_blank")
                              }
                              className={`text-xs ${
                                isUser
                                  ? "text-indigo-200 hover:text-white"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Ouvrir
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = message.image_url!;
                                a.download = mainFile.filename;
                                a.click();
                              }}
                              className={`text-xs ${
                                isUser
                                  ? "text-indigo-200 hover:text-white"
                                  : "text-gray-600 hover:text-gray-800"
                              }`}
                            >
                              <Download className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ✅ Affichage des fichiers extraits du texte */}
                  {fileUrls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div
                        className={`text-xs ${
                          isUser ? "text-indigo-200" : "text-gray-500"
                        }`}
                      >
                        Pièces jointes ({fileUrls.length})
                      </div>
                      {fileUrls.map((file, index) => (
                        <div key={index} className="flex items-center gap-2">
                          {file.type === "image" ? (
                            // ✅ Affichage miniature pour les images
                            <div className="flex items-center gap-2">
                              <img
                                src={file.url}
                                alt={`Image ${index + 1}`}
                                onClick={() => setPreviewSrc(file.url)}
                                className="w-16 h-16 object-cover rounded cursor-pointer border hover:opacity-90 transition-opacity"
                              />
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => window.open(file.url, "_blank")}
                                className={`text-xs ${
                                  isUser
                                    ? "text-indigo-200 hover:text-white"
                                    : "text-gray-600 hover:text-gray-800"
                                }`}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Voir en grand
                              </Button>
                            </div>
                          ) : (
                            // ✅ Affichage lien pour les autres fichiers
                            <div className="flex items-center gap-2 p-2 rounded border bg-white/10">
                              <FileText className="w-4 h-4" />
                              <span className="text-xs truncate max-w-32">
                                {file.filename}
                              </span>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    window.open(file.url, "_blank")
                                  }
                                  className={`text-xs ${
                                    isUser
                                      ? "text-indigo-200 hover:text-white"
                                      : "text-gray-600 hover:text-gray-800"
                                  }`}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    const a = document.createElement("a");
                                    a.href = file.url;
                                    a.download = file.filename;
                                    a.click();
                                  }}
                                  className={`text-xs ${
                                    isUser
                                      ? "text-indigo-200 hover:text-white"
                                      : "text-gray-600 hover:text-gray-800"
                                  }`}
                                >
                                  <Download className="w-3 h-3" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                </div>
              </div>
            </div>
          );
        })}

        {status === "resolved" && (
          <div className="text-center mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-center gap-2 text-green-700">
              <Shield className="w-5 h-5" />
              <span className="font-medium">Ce ticket est résolu</span>
            </div>
            <p className="text-sm text-green-600 mt-1">
              Merci d'avoir utilisé notre support !
            </p>
          </div>
        )}
      </div>

      {/* Overlay plein écran pour images */}
      {previewSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 cursor-pointer"
          onClick={() => setPreviewSrc(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={previewSrc}
              alt="Agrandissement pièce jointe"
              className="max-h-full max-w-full rounded-md shadow-2xl"
            />
            <button
              onClick={() => setPreviewSrc(null)}
              className="absolute top-4 right-4 w-8 h-8 bg-black bg-opacity-50 text-white rounded-full flex items-center justify-center hover:bg-opacity-70 transition-all"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Messages;
