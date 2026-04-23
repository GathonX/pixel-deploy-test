
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Copy, Check, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SidebarProvider } from "@/components/ui/sidebar";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formSchema = z.object({
  name: z.string().min(3, { message: "Le nom doit contenir au moins 3 caractères" }),
});

interface Token {
  id: string;
  name: string;
  token: string;
  createdAt: Date;
  lastUsed: Date | null;
}

const TokensContent = () => {
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([
    {
      id: "1",
      name: "Site Web",
      token: "pxr_FJ38dj29DLSIE39dlsiEI39sld",
      createdAt: new Date(2025, 3, 5),
      lastUsed: new Date(2025, 3, 7),
    },
    {
      id: "2",
      name: "Application Mobile",
      token: "pxr_KL34jk56AHSI74dlPOEI98qws",
      createdAt: new Date(2025, 2, 20),
      lastUsed: new Date(2025, 4, 2),
    },
  ]);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    setIsGenerating(true);
    
    // Simuler un délai de génération de token
    setTimeout(() => {
      const newToken: Token = {
        id: Math.random().toString(36).substring(2, 11),
        name: values.name,
        token: `pxr_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
        createdAt: new Date(),
        lastUsed: null,
      };
      
      setTokens([...tokens, newToken]);
      form.reset();
      setIsGenerating(false);
      
      toast({
        title: "Token généré avec succès",
        description: "Votre nouveau token a été créé et est prêt à être utilisé.",
      });
    }, 1000);
  };

  const handleCopyToken = (id: string, token: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenId(id);
    
    toast({
      title: "Token copié",
      description: "Le token a été copié dans votre presse-papiers.",
    });
    
    setTimeout(() => {
      setCopiedTokenId(null);
    }, 3000);
  };

  const handleDeleteToken = (id: string) => {
    setTokens(tokens.filter(token => token.id !== id));
    
    toast({
      title: "Token supprimé",
      description: "Le token a été supprimé avec succès.",
      variant: "destructive",
    });
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Tokens API</h1>
          <p className="text-muted-foreground">Générez et gérez vos tokens d'accès à l'API</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Générer un Nouveau Token</CardTitle>
            <CardDescription>
              Créez un nouveau token d'accès pour vos intégrations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du Token</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: Site Web, Application Mobile" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isGenerating}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  {isGenerating ? "Génération en cours..." : "Générer un Token"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Mes Tokens</CardTitle>
            <CardDescription>
              Liste de tous vos tokens générés
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tokens.length === 0 ? (
              <div className="text-center py-6">
                <KeyRound className="mx-auto h-10 w-10 text-muted-foreground/60" />
                <p className="mt-2 text-muted-foreground">Vous n'avez pas encore généré de tokens</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Créé le</TableHead>
                    <TableHead>Dernière utilisation</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((token) => (
                    <TableRow key={token.id}>
                      <TableCell className="font-medium">{token.name}</TableCell>
                      <TableCell className="font-mono text-xs">
                        <div className="flex items-center">
                          <span className="truncate max-w-[180px]">{token.token}</span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="ml-2"
                            onClick={() => handleCopyToken(token.id, token.token)}
                          >
                            {copiedTokenId === token.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(token.createdAt)}</TableCell>
                      <TableCell>{token.lastUsed ? formatDate(token.lastUsed) : "Jamais utilisé"}</TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDeleteToken(token.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
          <CardFooter className="flex justify-between text-sm text-muted-foreground">
            <p>Total: {tokens.length} tokens</p>
            <p>Dernier token généré: {tokens.length > 0 ? formatDate(tokens[tokens.length - 1].createdAt) : "Aucun"}</p>
          </CardFooter>
        </Card>
        
        <Card className="col-span-1 md:col-span-3">
          <CardHeader>
            <CardTitle>Guide d'Utilisation</CardTitle>
            <CardDescription>
              Comment utiliser vos tokens dans vos intégrations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">1. Authentification par Header</h3>
              <div className="bg-slate-100 p-3 rounded-md font-mono text-sm">
                Authorization: Bearer <span className="text-blue-600">votre_token</span>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium mb-2">2. Exemple de Requête</h3>
              <div className="bg-slate-100 p-3 rounded-md font-mono text-sm whitespace-pre">
{`fetch('https://api.pixelrise.com/v1/data', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer votre_token'
  }
})`}
              </div>
            </div>
            
            <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
              <h3 className="font-medium mb-2 flex items-center text-amber-800">
                <KeyRound className="mr-2 h-4 w-4" />
                Information Importante
              </h3>
              <p className="text-amber-700">
                Ne partagez jamais vos tokens. Ils donnent accès à votre compte et à vos données.
                En cas de compromission, supprimez immédiatement le token et générez-en un nouveau.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const TokensPage = () => {
  return (
    <SidebarProvider>
      <DashboardLayout>
        <TokensContent />
      </DashboardLayout>
    </SidebarProvider>
  );
};

export default TokensPage;
