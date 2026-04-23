import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Copy, ExternalLink, Check, AlertTriangle } from "lucide-react";
import { Facebook, Instagram, Twitter, Linkedin} from "lucide-react";
import { SocialMediaPost } from "@/services/socialMediaService";
import { formatForPlatform, validateForPlatform, copyToClipboard, exportToPlatform } from "@/utils/socialPostUtils";

interface PlatformPreviewProps {
  post: SocialMediaPost;
  platform: string;
  onExport?: (platform: string) => void;
}

export const PlatformPreview: React.FC<PlatformPreviewProps> = ({
  post,
  platform,
  onExport
}) => {
  const formattedContent = formatForPlatform(post, platform);
  const validation = validateForPlatform(formattedContent, platform);
  
  const getPlatformIcon = () => {
    const icons = {
      facebook: Facebook,
      instagram: Instagram,
      twitter: Twitter,
      linkedin: Linkedin,
    
    };
    const Icon = icons[platform.toLowerCase() as keyof typeof icons];
    return Icon ? <Icon className="h-4 w-4" /> : null;
  };

  const getPlatformColor = () => {
    const colors = {
      facebook: "text-blue-600 bg-blue-50 border-blue-200",
      instagram: "text-pink-600 bg-pink-50 border-pink-200",
      twitter: "text-blue-400 bg-blue-50 border-blue-200",
      linkedin: "text-blue-700 bg-blue-50 border-blue-200",

    };
    return colors[platform.toLowerCase() as keyof typeof colors] || "text-gray-600 bg-gray-50 border-gray-200";
  };

  const handleCopy = () => {
    copyToClipboard(formattedContent, `Contenu ${platform} copié !`);
  };

  const handleExport = () => {
    if (onExport) {
      onExport(platform);
    } else {
      exportToPlatform(post, platform);
    }
  };

  return (
    <Card className={`${getPlatformColor()}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getPlatformIcon()}
            <span className="capitalize">{platform}</span>
          </div>
          <div className="flex items-center gap-1">
            {validation.isValid ? (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Check className="h-3 w-3 mr-1" />
                Valide
              </Badge>
            ) : (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Trop long
              </Badge>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Aperçu du contenu */}
        <div className="bg-white rounded-md border p-3">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">
            {formattedContent}
          </p>
        </div>

        {/* Statistiques */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>
            {validation.currentLength} / {validation.maxLength} caractères
          </span>
          <span className={validation.remaining >= 0 ? "text-green-600" : "text-red-600"}>
            {validation.remaining >= 0 ? `${validation.remaining} restants` : `${Math.abs(validation.remaining)} en trop`}
          </span>
        </div>

        {/* Barre de progression */}
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all ${
              validation.isValid 
                ? validation.currentLength / validation.maxLength > 0.8 
                  ? "bg-yellow-500" 
                  : "bg-green-500"
                : "bg-red-500"
            }`}
            style={{ 
              width: `${Math.min((validation.currentLength / validation.maxLength) * 100, 100)}%` 
            }}
          />
        </div>

        <Separator />

        {/* Actions */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleCopy}
            className="flex-1"
          >
            <Copy className="h-3 w-3 mr-2" />
            Copier
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleExport}
            className="flex-1"
          >
            <ExternalLink className="h-3 w-3 mr-2" />
            Publier
          </Button>
        </div>

        {/* Images */}
        {post.images && post.images.length > 0 && (
          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">
              {post.images.length} image(s) incluse(s)
            </span>
            <div className="grid grid-cols-2 gap-1">
              {post.images.slice(0, 2).map((image, index) => (
                <div key={index} className="relative">
                  <img 
                    src={image} 
                    alt={`Image ${index + 1}`}
                    className="w-full h-16 object-cover rounded border"
                  />
                  {post.images && post.images.length > 2 && index === 1 && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-medium">
                        +{post.images.length - 2}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};