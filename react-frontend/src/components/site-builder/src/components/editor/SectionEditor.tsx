import { Section } from '@/types/platform';
import { usePlatform } from '../../contexts/PlatformContext';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { X } from 'lucide-react';

interface SectionEditorProps {
  section: Section;
  onUpdate: (content: Record<string, unknown>, styles: Record<string, unknown>) => void;
  onClose: () => void;
}

export function SectionEditor({ section, onUpdate, onClose }: SectionEditorProps) {
  const { sectionTypes } = usePlatform();
  const sectionType = sectionTypes.find((st: any) => st.id === section.sectionTypeId);
  const content = section.content as Record<string, any>;
  const styles = section.styles as Record<string, any>;

  const updateContent = (key: string, value: any) => {
    onUpdate({ ...content, [key]: value }, styles);
  };

  const updateStyle = (key: string, value: any) => {
    onUpdate(content, { ...styles, [key]: value });
  };

  const renderContentEditor = () => {
    switch (section.sectionTypeId) {
      case 'hero':
        return (
          <>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input 
                value={content.title || ''} 
                onChange={(e) => updateContent('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Sous-titre</Label>
              <Textarea 
                value={content.subtitle || ''} 
                onChange={(e) => updateContent('subtitle', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Texte du bouton</Label>
              <Input 
                value={content.ctaText || ''} 
                onChange={(e) => updateContent('ctaText', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Lien du bouton</Label>
              <Input 
                value={content.ctaLink || ''} 
                onChange={(e) => updateContent('ctaLink', e.target.value)}
              />
            </div>
          </>
        );

      case 'about':
        return (
          <>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input 
                value={content.title || ''} 
                onChange={(e) => updateContent('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea 
                value={content.content || ''} 
                onChange={(e) => updateContent('content', e.target.value)}
                rows={6}
              />
            </div>
          </>
        );

      case 'contact':
        return (
          <>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input 
                value={content.title || ''} 
                onChange={(e) => updateContent('title', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                value={content.email || ''} 
                onChange={(e) => updateContent('email', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Téléphone</Label>
              <Input 
                value={content.phone || ''} 
                onChange={(e) => updateContent('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Adresse</Label>
              <Input 
                value={content.address || ''} 
                onChange={(e) => updateContent('address', e.target.value)}
              />
            </div>
          </>
        );

      default:
        return (
          <div className="space-y-2">
            <Label>Titre</Label>
            <Input 
              value={content.title || ''} 
              onChange={(e) => updateContent('title', e.target.value)}
            />
          </div>
        );
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">{sectionType?.name || 'Section'}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {/* Content */}
          <div>
            <h4 className="text-sm font-medium mb-4">Contenu</h4>
            <div className="space-y-4">
              {renderContentEditor()}
            </div>
          </div>

          <Separator />

          {/* Styles */}
          <div>
            <h4 className="text-sm font-medium mb-4">Styles</h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Couleur de fond</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={styles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="w-12 h-10 p-1"
                  />
                  <Input 
                    value={styles.backgroundColor || '#ffffff'}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    className="flex-1"
                  />
                </div>
              </div>
              {(section.sectionTypeId === 'hero' || section.sectionTypeId === 'testimonials' || section.sectionTypeId === 'footer') && (
                <div className="space-y-2">
                  <Label>Couleur du texte</Label>
                  <div className="flex gap-2">
                    <Input 
                      type="color"
                      value={styles.textColor || '#000000'}
                      onChange={(e) => updateStyle('textColor', e.target.value)}
                      className="w-12 h-10 p-1"
                    />
                    <Input 
                      value={styles.textColor || '#000000'}
                      onChange={(e) => updateStyle('textColor', e.target.value)}
                      className="flex-1"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
