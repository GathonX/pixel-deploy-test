// src/components/DeleteAccountCard.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import api from "@/services/api";
import { AlertTriangle, Star, MessageCircle, ThumbsUp, ThumbsDown } from "lucide-react";
import axios, { AxiosError } from "axios";

interface DeletionReasons {
  [key: string]: string;
}

export default function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [reasons, setReasons] = useState<DeletionReasons>({});
  const [formData, setFormData] = useState({
    reason: "",
    detailed_reason: "",
    satisfaction_rating: 0,
    suggestions: "",
    would_recommend: null as boolean | null
  });
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchDeletionReasons();
    }
  }, [open]);

  const fetchDeletionReasons = async () => {
    try {
      const response = await api.get('/account/deletion-reasons');
      setReasons(response.data.reasons);
    } catch (error) {
      console.error('Erreur lors de la récupération des raisons:', error);
    }
  };

  const requestDeletion = async () => {
    if (!formData.reason) {
      toast({
        title: "Information manquante",
        description: "Veuillez sélectionner une raison de suppression.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await api.post("/account/delete-request", formData);
      toast({
        title: "Email envoyé",
        description: "Un email de confirmation de suppression vous a été envoyé.",
        variant: "success",
      });
      setOpen(false);
      resetForm();
    } catch (error: unknown) {
      let msg = "Une erreur inattendue est survenue.";
      if (axios.isAxiosError(error)) {
        msg = (error.response?.data as { message?: string })?.message 
              ?? error.message 
              ?? msg;
      }
      toast({
        title: "Erreur",
        description: msg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep(1);
    setFormData({
      reason: "",
      detailed_reason: "",
      satisfaction_rating: 0,
      suggestions: "",
      would_recommend: null
    });
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, satisfaction_rating: star }))}
            className={`transition-colors hover:scale-110 transform ${
              star <= formData.satisfaction_rating 
                ? "text-yellow-400" 
                : "text-gray-300 hover:text-yellow-300"
            }`}
          >
            <Star className={`w-6 h-6 ${
              star <= formData.satisfaction_rating ? "fill-current" : ""
            }`} />
          </button>
        ))}
      </div>
    );
  };

  return (
    <>
      <Card className="mt-6 border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100 shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-red-700 font-bold">Zone Danger</CardTitle>
              <CardDescription className="text-red-600 mt-1">
                Suppression définitive du compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-700 text-sm font-medium mb-2">
              ⚠️ Action irréversible
            </p>
            <p className="text-red-600 text-sm">
              Toutes vos données, articles, et paramètres seront définitivement supprimés.
            </p>
          </div>
          <div className="flex justify-end">
            <Button 
              variant="destructive" 
              onClick={() => setOpen(true)}
              className="bg-red-600 hover:bg-red-700 font-semibold shadow-md"
            >
              Supprimer mon compte
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              Aidez-nous à améliorer Pixel Rise
            </DialogTitle>
            <div className="mt-4">
              <Progress value={(step / 3) * 100} className="h-2" />
              <p className="text-sm text-gray-500 mt-2">Étape {step} sur 3</p>
            </div>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold text-gray-800">
                    Quelle est la principale raison de votre départ ? *
                  </Label>
                  <Select 
                    value={formData.reason} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Sélectionnez une raison" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(reasons).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-800">
                    Pouvez-vous nous en dire plus ? (optionnel)
                  </Label>
                  <Textarea
                    value={formData.detailed_reason}
                    onChange={(e) => setFormData(prev => ({ ...prev, detailed_reason: e.target.value }))}
                    placeholder="Expliquez-nous ce qui pourrait être amélioré..."
                    className="mt-2 min-h-[100px]"
                    maxLength={1000}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {formData.detailed_reason.length}/1000 caractères
                  </p>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">
                    Évaluez votre expérience
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Comment évalueriez-vous votre expérience globale avec Pixel Rise ?
                  </p>
                  <div className="flex justify-center">
                    {renderStarRating()}
                  </div>
                  {formData.satisfaction_rating > 0 && (
                    <p className="text-sm text-gray-500 mt-2">
                      {formData.satisfaction_rating === 1 && "Très insatisfait"}
                      {formData.satisfaction_rating === 2 && "Insatisfait"}
                      {formData.satisfaction_rating === 3 && "Neutre"}
                      {formData.satisfaction_rating === 4 && "Satisfait"}
                      {formData.satisfaction_rating === 5 && "Très satisfait"}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-base font-semibold text-gray-800">
                    Avez-vous des suggestions d'amélioration ?
                  </Label>
                  <Textarea
                    value={formData.suggestions}
                    onChange={(e) => setFormData(prev => ({ ...prev, suggestions: e.target.value }))}
                    placeholder="Partagez vos idées pour améliorer notre service..."
                    className="mt-2 min-h-[80px]"
                    maxLength={1000}
                  />
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    Une dernière question
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Recommanderiez-vous Pixel Rise à un ami ou collègue ?
                  </p>
                  <RadioGroup
                    value={formData.would_recommend === null ? "" : formData.would_recommend.toString()}
                    onValueChange={(value) => setFormData(prev => ({ 
                      ...prev, 
                      would_recommend: value === "true" 
                    }))}
                    className="flex justify-center space-x-8"
                  >
                    <div className="flex items-center space-x-2 bg-green-50 p-4 rounded-lg border border-green-200">
                      <RadioGroupItem value="true" id="yes" />
                      <Label htmlFor="yes" className="flex items-center gap-2 cursor-pointer font-medium text-green-700">
                        <ThumbsUp className="h-4 w-4" />
                        Oui, certainement
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 bg-red-50 p-4 rounded-lg border border-red-200">
                      <RadioGroupItem value="false" id="no" />
                      <Label htmlFor="no" className="flex items-center gap-2 cursor-pointer font-medium text-red-700">
                        <ThumbsDown className="h-4 w-4" />
                        Non, pas vraiment
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <p className="font-semibold text-amber-800">Confirmation finale</p>
                  </div>
                  <p className="text-amber-700 text-sm">
                    En cliquant sur "Envoyer l'email de confirmation", vous recevrez un email pour 
                    finaliser la suppression de votre compte. Cette action sera alors irréversible.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex justify-between pt-4 border-t">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleClose} disabled={loading}>
                Annuler
              </Button>
              {step > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => setStep(step - 1)} 
                  disabled={loading}
                >
                  Retour
                </Button>
              )}
            </div>
            
            <div className="flex gap-2">
              {step < 3 ? (
                <Button 
                  onClick={() => setStep(step + 1)}
                  disabled={step === 1 && !formData.reason}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Continuer
                </Button>
              ) : (
                <Button 
                  variant="destructive" 
                  onClick={requestDeletion} 
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 font-semibold"
                >
                  {loading ? "Envoi..." : "Envoyer l'email de confirmation"}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}