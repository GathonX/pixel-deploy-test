// src/components/admin/tickets/Messages.tsx
import React, { useState } from "react";
import { MessageSquare, FileText, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Ticket } from "@/models/Ticket";

interface MessagesProps {
  selectedTicket: Ticket;
}

const Messages: React.FC<MessagesProps> = ({ selectedTicket }) => {
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

  return (
    <>
      <h3 className="font-medium mb-2 flex items-center">
        <MessageSquare className="h-4 w-4 mr-1" />
        Conversation
      </h3>
      <div className="space-y-4 max-h-[400px] overflow-y-auto p-4 bg-gray-50 rounded-lg border">
        {selectedTicket.messages.map((message, idx) => {
          const isUser = message.sender === "user";
          const fileUrls = extractFileUrls(message.text);
          const cleanText = removeUrlsFromText(message.text);

          // ✅ DÉTECTION : Type de fichier principal (image_url)
          const mainFile = message.image_url
            ? getFileType(message.image_url)
            : null;

          return (
            <div
              key={idx}
              className={`flex ${isUser ? "justify-start" : "justify-end"}`}
            >
              <div
                className={`flex items-start gap-3 max-w-[80%] ${
                  isUser ? "flex-row" : "flex-row-reverse"
                }`}
              >
                {/* ✅ Avatar Admin/User */}
                <div
                  className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center shadow-md ${
                    isUser
                      ? "bg-gradient-to-br from-gray-400 to-gray-600 text-white ring-2 ring-gray-200"
                      : "bg-gradient-to-br from-blue-500 to-blue-700 text-white ring-2 ring-blue-200"
                  }`}
                >
                  {isUser ? (
                    <span className="text-sm font-semibold">U</span>
                  ) : (
                    <span className="text-sm font-semibold">A</span>
                  )}
                </div>

                {/* ✅ Message Professional */}
                <div
                  className={`rounded-2xl p-4 shadow-sm ${
                    isUser
                      ? "bg-white border border-gray-200 rounded-bl-md"
                      : "bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-br-md"
                  }`}
                >
                  {/* ✅ En-tête Professionnel Admin */}
                  <div className="flex items-center justify-between mb-2">
                    <div className={`text-xs font-semibold ${
                      isUser ? "text-gray-600" : "text-blue-100"
                    }`}>
                      {isUser ? `👤 ${selectedTicket.user.name}` : "🛡️ Support Admin"}
                    </div>
                    <div className={`text-xs ${
                      isUser ? "text-gray-400" : "text-blue-200"
                    }`}>
                      {new Date(message.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>

                  {/* ✅ Texte Professionnel Admin */}
                  {cleanText && (
                    <p className={`text-sm whitespace-pre-wrap leading-relaxed ${
                      isUser ? "text-gray-700" : "text-white"
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
                      className="max-h-40 w-auto object-contain rounded-md border cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setPreviewSrc(message.image_url)}
                    />
                  ) : (
                    // ✅ Fichier non-image : Affichage sous forme de lien
                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
                      <FileText className="w-6 h-6 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-700">
                          {mainFile.filename}
                        </p>
                        <p className="text-xs text-gray-500">
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
                          className="text-xs text-gray-600 hover:text-gray-800"
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
                          className="text-xs text-gray-600 hover:text-gray-800"
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
                  <div className="text-xs text-gray-500">
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
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Voir en grand
                          </Button>
                        </div>
                      ) : (
                        // ✅ Affichage lien pour les autres fichiers
                        <div className="flex items-center gap-2 p-2 rounded border bg-gray-50">
                          <FileText className="w-4 h-4 text-gray-500" />
                          <span className="text-xs truncate max-w-32 text-gray-700">
                            {file.filename}
                          </span>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => window.open(file.url, "_blank")}
                              className="text-xs text-gray-600 hover:text-gray-800"
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
                              className="text-xs text-gray-600 hover:text-gray-800"
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
      </div>

      {/* Overlay plein écran */}
      {previewSrc && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreviewSrc(null)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]">
            <img
              src={previewSrc}
              alt="Agrandissement pièce jointe"
              className="max-h-full max-w-full rounded-md shadow-lg"
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
