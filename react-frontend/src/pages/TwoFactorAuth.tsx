import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { enableTwoFactor, verifyTwoFactor } from "@/services/api";

const twoFactorSchema = z.object({
  code: z.string().length(6, "Le code doit contenir 6 chiffres"),
});

const TwoFactorAuth = () => {
  const navigate = useNavigate();
  const [isCodeSent, setIsCodeSent] = useState(false);
  const form = useForm<z.infer<typeof twoFactorSchema>>({
    resolver: zodResolver(twoFactorSchema),
    defaultValues: { code: "" },
  });

  const handleEnable = async () => {
    try {
      await enableTwoFactor();
      setIsCodeSent(true);
      toast.success("Code envoyé à votre email !");
    } catch (error) {
      toast.error("Erreur lors de l'envoi du code");
    }
  };

  async function onSubmit(values: z.infer<typeof twoFactorSchema>) {
    try {
      await verifyTwoFactor(values);
      toast.success("2FA activée !");
      navigate("/profile");
    } catch (error: any) {
      if (error.response?.status === 422) {
        Object.values(error.response.data.errors).forEach((err: any) =>
          toast.error(err[0])
        );
      } else {
        toast.error("Erreur lors de la vérification");
      }
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Vérification à deux facteurs</CardTitle>
            <CardDescription>
              Configurez la 2FA pour plus de sécurité
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!isCodeSent ? (
              <div className="text-center">
                <p className="mb-4">
                  Cliquez pour recevoir un code par email.
                </p>
                <Button onClick={handleEnable}>Activer la 2FA</Button>
              </div>
            ) : (
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Code de vérification</FormLabel>
                        <FormControl>
                          <Input placeholder="123456" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit">Vérifier</Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default TwoFactorAuth;