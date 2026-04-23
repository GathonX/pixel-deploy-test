import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useParams } from 'react-router-dom';
import { Section } from '../../types/platform';
import { usePlatform } from '../../contexts/PlatformContext';
import { Button } from '../ui/button';
import { GripVertical, Settings, Trash2, Copy, ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { renderSectionContent } from './SectionRenderer';

interface DraggableSectionProps {
  section: Section;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  onNavigate?: (slug: string) => void;
}

export function DraggableSection({
  section,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  onNavigate,
}: DraggableSectionProps) {
  const { sectionTypes } = usePlatform();
  const { siteId } = useParams<{ siteId: string }>();

  // Safety check - if section is undefined, don't render
  if (!section || !section.id) {
    return null;
  }

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const sectionType = sectionTypes.find((st: any) => st.id === section.sectionTypeId);
  const content = { ...sectionType?.defaultContent, ...section.content, __siteId__: siteId } as Record<string, any>;
  const translations = (section.translations ?? {}) as Record<string, any>;
  const styles = { ...sectionType?.defaultStyles, ...section.styles } as Record<string, any>;

  // Generic style wrapper properties (shadow, borderRadius, backgroundOpacity)
  const shadowMap: Record<string, string> = {
    none: 'none', sm: '0 1px 3px rgba(0,0,0,0.12)', md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 25px rgba(0,0,0,0.15)', xl: '0 20px 50px rgba(0,0,0,0.2)'
  };
  const radiusMap: Record<string, string> = {
    none: '0', sm: '8px', md: '12px', lg: '20px', full: '9999px'
  };
  const wrapperStyle: React.CSSProperties = {};
  if (styles.shadow && styles.shadow !== 'none') wrapperStyle.boxShadow = shadowMap[styles.shadow] || 'none';
  if (styles.borderRadius && styles.borderRadius !== 'none') wrapperStyle.borderRadius = radiusMap[styles.borderRadius] || '0';
  if (styles.backgroundOpacity !== undefined && styles.backgroundOpacity < 100) wrapperStyle.opacity = styles.backgroundOpacity / 100;

  const renderContent = () => {
    return renderSectionContent(section.sectionTypeId, content, styles, sectionTypes, onNavigate, translations);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group transition-all overflow-hidden",
        isSelected && "ring-2 ring-primary ring-offset-2",
        isDragging && "opacity-50 z-50"
      )}
      onClick={onSelect}
    >
      {/* Section Controls */}
      <div className={cn(
        "absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity",
        isSelected && "opacity-100"
      )}>
        <Button size="icon" variant="secondary" className="h-8 w-8 cursor-grab active:cursor-grabbing" {...attributes} {...listeners}>
          <GripVertical className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onMoveUp(); }} disabled={isFirst}>
          <ChevronUp className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onMoveDown(); }} disabled={isLast}>
          <ChevronDown className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="secondary" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onDuplicate(); }}>
          <Copy className="w-4 h-4" />
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
        "absolute top-2 left-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity",
        isSelected && "opacity-100"
      )}>
        <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded font-medium">
          {sectionType?.name || section.sectionTypeId}
        </span>
      </div>

      <div
        style={wrapperStyle}
        className="overflow-hidden"
        onClick={(e) => {
          const anchor = (e.target as Element).closest('a');
          if (anchor) {
            e.preventDefault();
            e.stopPropagation(); // évite de déclencher onSelect
            const href = anchor.getAttribute('href');
            if (href && href !== '#' && onNavigate && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:')) {
              onNavigate(href);
            }
          }
        }}
      >
        {renderContent()}
      </div>
    </div>
  );
}
