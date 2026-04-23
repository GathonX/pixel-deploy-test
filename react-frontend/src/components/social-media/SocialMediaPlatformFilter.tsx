import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Facebook, Instagram, Twitter, Linkedin} from "lucide-react";

interface SocialMediaPlatformFilterProps {
  platformFilter: string;
  setPlatformFilter: (platform: string) => void;
  onGenerateAI: () => void;
}

export const SocialMediaPlatformFilter: React.FC<SocialMediaPlatformFilterProps> = ({
  platformFilter,
  setPlatformFilter,
  onGenerateAI
}) => {
  return (
    <div className="mb-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Filtrer par réseau social</h3>
            <Button variant="outline" size="sm" onClick={onGenerateAI}>
              Générer du contenu IA
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="all" 
            value={platformFilter} 
            onValueChange={setPlatformFilter}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 md:grid-cols-6 gap-2">
              <TabsTrigger value="all">
                <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                  Tous
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="facebook">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1">
                  <Facebook className="h-3 w-3" />
                  <span>Facebook</span>
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="instagram">
                <Badge className="bg-pink-100 text-pink-800 hover:bg-pink-200 flex items-center gap-1">
                  <Instagram className="h-3 w-3" />
                  <span>Instagram</span>
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="twitter">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 flex items-center gap-1">
                  <Twitter className="h-3 w-3" />
                  <span>Twitter</span>
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="linkedin">
                <Badge className="bg-blue-700 text-white hover:bg-blue-800 flex items-center gap-1">
                  <Linkedin className="h-3 w-3" />
                  <span>LinkedIn</span>
                </Badge>
              </TabsTrigger>
              
            </TabsList>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};