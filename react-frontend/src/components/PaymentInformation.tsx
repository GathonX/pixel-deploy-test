import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Copy,
  Check,
  CreditCard,
  Building2,
  Phone,
  User,
  MapPin,
  Banknote,
} from "lucide-react";

const PaymentInformation: React.FC = () => {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copié !",
        description: `${field} copié dans le presse-papiers`,
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de copier",
        variant: "destructive",
      });
    }
  };

  const CopyButton: React.FC<{ text: string; field: string }> = ({
    text,
    field,
  }) => (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => copyToClipboard(text, field)}
      className="ml-2 h-6 w-6 p-0"
    >
      {copiedField === field ? (
        <Check className="h-3 w-3 text-green-600" />
      ) : (
        <Copy className="h-3 w-3" />
      )}
    </Button>
  );

  return (
    <div className="space-y-4 pb-3">
      {/* Orange Money et Mvola - Sur la même ligne sur grand écran */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Orange Money */}
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <Phone className="w-5 h-5" />
              Orange Money
              <Badge variant="secondary" className="ml-auto">
                Recommandé
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">Numéro</p>
                <p className="font-mono text-lg">037 88 367 14</p>
              </div>
              <CopyButton text="0378836714" field="Orange Money" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">
                  Destinataire
                </p>
                <p className="font-semibold">JAORAVO MAUNAUS</p>
              </div>
              <CopyButton text="JAORAVO MAUNAUS" field="Destinataire Orange" />
            </div>
          </CardContent>
        </Card>

        {/* Mvola */}
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <Phone className="w-5 h-5" />
              Mvola
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Numéro</p>
                <p className="font-mono text-lg">038 38 255 69</p>
              </div>
              <CopyButton text="0383825569" field="Mvola" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">
                  Destinataire
                </p>
                <p className="font-semibold">JAORAVO MAUNAUS</p>
              </div>
              <CopyButton text="JAORAVO MAUNAUS" field="Destinataire Mvola" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Informations Bancaires */}
      <Card className="border-blue-200 bg-blue-50 hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-blue-800">
            <Building2 className="w-5 h-5" />
            Virement Bancaire
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Informations personnelles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Nom</p>
                <p className="font-semibold">JAORAVO</p>
              </div>
              <CopyButton text="JAORAVO" field="Nom" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Prénom</p>
                <p className="font-semibold">MAUNAUS</p>
              </div>
              <CopyButton text="MAUNAUS" field="Prénom" />
            </div>
          </div>

          {/* Informations bancaires */}
          <div className="space-y-3 border-t border-blue-200 pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Banque</p>
                <p className="font-semibold">MCB Madagascar</p>
              </div>
              <CopyButton text="MCB Madagascar" field="Banque" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">IBAN</p>
                <p className="font-mono text-sm bg-white px-2 py-1 rounded border">
                  MG4600006000100001357468
                </p>
              </div>
              <CopyButton text="MG4600006000100001357468" field="IBAN" />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">BIC/SWIFT</p>
                <p className="font-mono text-sm bg-white px-2 py-1 rounded border">
                  MCBLMGMGXXX
                </p>
              </div>
              <CopyButton text="MCBLMGMGXXX" field="BIC/SWIFT" />
            </div>
          </div>

         
        </CardContent>
      </Card>

    </div>
  );
};

export default PaymentInformation;
