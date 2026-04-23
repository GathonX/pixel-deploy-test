import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { User, Clock, Calendar, Network, Smartphone, CheckCircle, XCircle, Globe, MapPin, Code, Copy, Trash2 } from "lucide-react";
import api from "@/services/api";

interface UserAgent {
    id: number;
    user: { name: string } | null;
    agent: string;
    device: string;
    action: string;
    status: string;
    page: string;
    language: string;
    timezone: string;
    ip_address: string;
    created_at: string;
}

interface UserAgentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    userAgent: UserAgent | null;
    onDelete: (id: number) => void; // Callback pour gérer la suppression
}

export default function UserAgentDetailsModal({ isOpen, onClose, userAgent, onDelete }: UserAgentDetailsModalProps) {
    const [copiedField, setCopiedField] = useState<"ip" | "agent" | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    if (!userAgent) return null;

    const handleCopy = async (text: string, field: "ip" | "agent") => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000); // Réinitialiser après 2 secondes
        } catch (err) {
            console.error("Erreur lors de la copie :", err);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Êtes-vous sûr de vouloir supprimer ce user-agent ?")) return;

        setIsDeleting(true);
        try {
            await api.delete(`/admin/user-agents/${userAgent.id}`);
            onDelete(userAgent.id); // Appeler la fonction de suppression
            onClose(); // Fermer la modale après suppression
        } catch (err) {
            console.error("Erreur lors de la suppression :", err);
            alert("Une erreur est survenue lors de la suppression.");
        } finally {
            setIsDeleting(false);
        }
    };

    // Gestion du fuseau horaire
    const displayTimezone = userAgent.timezone && userAgent.timezone !== "unknown" ? userAgent.timezone : "Non disponible";

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] sm:max-w-[600px] rounded-lg shadow-xl bg-white dark:bg-gray-800">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                        Détails du User-Agent
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-6 py-4">
                    {/* Section Utilisateur */}
                    <Card className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                            <div className="flex items-center space-x-3">
                                <User className="h-5 w-5 text-blue-500" />
                                <div>
                                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Utilisateur</p>
                                    <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                        {userAgent.user?.name || "Inconnu"}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Section Action et Statut */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <CheckCircle className="h-5 w-5 text-green-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Action</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {userAgent.action || "N/A"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    {userAgent.status === "Succès" ? (
                                        <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                        <XCircle className="h-5 w-5 text-red-500" />
                                    )}
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Statut</p>
                                        <Badge variant={userAgent.status === "Succès" ? "default" : "destructive"}>
                                            {userAgent.status}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section Date et IP */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <Calendar className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date et heure</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {new Date(userAgent.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <Network className="h-5 w-5 text-blue-500" />
                                        <div>
                                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Adresse IP</p>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                                {userAgent.ip_address}
                                            </p>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleCopy(userAgent.ip_address, "ip")}
                                    >
                                        <Copy className="h-4 w-4 mr-1" />
                                        {copiedField === "ip" ? "Copié !" : "Copier"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section Appareil et Page */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <Smartphone className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Appareil</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {userAgent.device || "Inconnu"}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <Globe className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Page</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {userAgent.page}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section Langue et Fuseau */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <Globe className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Langue</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {userAgent.language}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="border border-gray-200 dark:border-gray-700">
                            <CardContent className="p-4">
                                <div className="flex items-center space-x-3">
                                    <MapPin className="h-5 w-5 text-blue-500" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Fuseau horaire</p>
                                        <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                                            {displayTimezone}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Section Agent brut */}
                    <Card className="border border-gray-200 dark:border-gray-700">
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start space-x-3 flex-1">
                                    <Code className="h-5 w-5 text-blue-500 mt-1" />
                                    <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Agent brut</p>
                                        <code className="text-sm text-gray-900 dark:text-gray-100 break-words whitespace-pre-wrap block bg-gray-100 dark:bg-gray-900 p-2 rounded-md">
                                            {userAgent.agent}
                                        </code>
                                    </div>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(userAgent.agent, "agent")}
                                    className="ml-2"
                                >
                                    <Copy className="h-4 w-4 mr-1" />
                                    {copiedField === "agent" ? "Copié !" : "Copier"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <DialogFooter>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className="mr-2"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? "Suppression..." : "Supprimer"}
                    </Button>
                    <Button variant="outline" onClick={onClose}>
                        Fermer
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}