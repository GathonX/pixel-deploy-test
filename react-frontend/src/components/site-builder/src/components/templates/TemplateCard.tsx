import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Template } from '@/types/platform';
import { Eye, Plus, Lock, Crown } from 'lucide-react';

interface TemplateCardProps {
  template: Template;
  onSelect: (template: Template) => void;
  onPreview: (template: Template) => void;
}

export function TemplateCard({ template, onSelect, onPreview }: TemplateCardProps) {
  return (
    <Card className="group overflow-hidden transition-all hover:shadow-lg hover:border-primary/50">
      <div className="relative aspect-video overflow-hidden">
        <img
          src={template.thumbnail}
          alt={template.name}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
        />
        {/* Badge Gratuit / Premium */}
        <div className="absolute top-3 left-3 z-10">
          {template.isPremium ? (
            <div className="flex flex-col gap-1">
              <Badge className="bg-amber-500 hover:bg-amber-500 text-white shadow-lg gap-1">
                <Crown className="w-3 h-3" />
                Premium - {template.price}€
              </Badge>
              {template.priceAriary != null && (
                <Badge className="bg-amber-600 hover:bg-amber-600 text-white shadow-lg text-[10px]">
                  {template.priceAriary.toLocaleString('fr-FR')} Ar
                </Badge>
              )}
            </div>
          ) : (
            <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white shadow-lg">
              Gratuit
            </Badge>
          )}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4 gap-2">
          <Button size="sm" variant="secondary" onClick={() => onPreview(template)}>
            <Eye className="w-4 h-4 mr-1" />
            Aperçu
          </Button>
          <Button size="sm" onClick={() => onSelect(template)}>
            {template.isPremium ? (
              <>
                <Lock className="w-4 h-4 mr-1" />
                Acheter
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-1" />
                Utiliser
              </>
            )}
          </Button>
        </div>
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{template.name}</CardTitle>
          <Badge variant="secondary">{template.category}</Badge>
        </div>
        <CardDescription>{template.description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>v{template.version}</span>
          <Badge
            variant={template.status === 'active' ? 'default' : 'outline'}
            className={template.status === 'active' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
          >
            {template.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
