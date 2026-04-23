
import React from "react";
import { WebsiteTemplate } from "@/data/websiteTemplates";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface TemplateViewerProps {
  template: WebsiteTemplate;
  onBack: () => void;
}

const TemplateViewer: React.FC<TemplateViewerProps> = ({ template, onBack }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{template.name}</h1>
        </div>
        
        <Button disabled>
          Use This Template
        </Button>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <div className="aspect-video bg-muted">
          <img
            src={template.previewUrl || template.thumbnail}
            alt={`${template.name} preview`}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">About this template</h2>
        <p>{template.description}</p>
        
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Tags</h3>
          <div className="flex flex-wrap gap-2">
            {template.tags.map(tag => (
              <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplateViewer;
