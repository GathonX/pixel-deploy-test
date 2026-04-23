import { Section } from '../../types/platform';
import { usePlatform } from '../../contexts/PlatformContext';
import { Button } from '../ui/button';
import { GripVertical, Settings, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderSection } from './sections/sectionRegistry';

// Props for full section with controls (used by DraggableSection)
interface FullSectionRendererProps {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

// Props for simple rendering (used for global navbar/footer)
interface SimpleSectionRendererProps {
  sectionTypeId: string;
  content: Record<string, any>;
  styles: Record<string, any>;
  onNavigate?: (slug: string) => void;
}

// Union type for both use cases
type SectionRendererProps = FullSectionRendererProps | SimpleSectionRendererProps;

// Type guard to check which props type we have
function isFullProps(props: SectionRendererProps): props is FullSectionRendererProps {
  return 'section' in props;
}

// Core rendering function (exported for LiveSectionPreview)
export function renderSectionContent(
  sectionTypeId: string | undefined,
  content: Record<string, any>,
  styles: Record<string, any>,
  sectionTypes: any[],
  onNavigate?: (slug: string) => void,
  translations?: Record<string, any>,
) {
  if (!sectionTypeId) {
    return (
      <div className="py-12 px-8 bg-muted text-center">
        <p className="text-muted-foreground">Section type non défini</p>
      </div>
    );
  }

  const registered = renderSection(sectionTypeId, content, styles, onNavigate, undefined, translations);
  if (registered) return registered;

  const sectionType = sectionTypes.find((st: any) => st.id === sectionTypeId);
  return (
    <div className="py-12 px-8 bg-muted text-center">
      <p className="text-muted-foreground">{sectionType?.name || sectionTypeId}</p>
    </div>
  );
}

export function SectionRenderer(props: SectionRendererProps) {
  const { sectionTypes } = usePlatform();

  // Simple rendering mode (for global navbar/footer)
  if (!isFullProps(props)) {
    const { sectionTypeId, content, styles, onNavigate } = props;
    return renderSectionContent(sectionTypeId, content || {}, styles || {}, sectionTypes, onNavigate);
  }

  // Full rendering mode with controls (for draggable sections)
  const { section, isSelected, onSelect, onEdit, onDelete } = props;

  if (!section) {
    return (
      <div className="py-12 px-8 bg-muted text-center">
        <p className="text-muted-foreground">Section non définie</p>
      </div>
    );
  }

  const sectionType = sectionTypes.find((st: any) => st.id === section.sectionTypeId);
  const content = (section.content || {}) as Record<string, any>;
  const translations = (section.translations || {}) as Record<string, any>;
  const styles = (section.styles || {}) as Record<string, any>;

  return (
    <div
      className={cn(
        "relative group cursor-pointer transition-all",
        isSelected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={onSelect}
    >
      {/* Section Controls */}
      <div className={cn(
        "absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        isSelected && "opacity-100"
      )}>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); }}>
          <GripVertical className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Settings className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="destructive" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Section Label */}
      <div className={cn(
        "absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity",
        isSelected && "opacity-100"
      )}>
        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
          {sectionType?.name || section.sectionTypeId || 'Section'}
        </span>
      </div>

      {renderSectionContent(section.sectionTypeId, content, styles, sectionTypes, undefined, translations)}
    </div>
  );
}
