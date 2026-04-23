
import React from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WebsiteTemplate } from "@/data/websiteTemplates";

interface TemplateCardProps {
  template: WebsiteTemplate;
  onSelect: (template: WebsiteTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect }) => {
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="aspect-video bg-muted rounded-md mb-4">
          <img 
            src={template.thumbnail} 
            alt={template.name}
            className="w-full h-full object-cover"
          />
        </div>
        <h3 className="text-lg font-medium">{template.name}</h3>
        <p className="text-sm text-muted-foreground">{template.description}</p>
      </CardContent>
      <CardFooter className="flex justify-between p-4 pt-0">
        <div className="flex flex-wrap gap-1">
          {template.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded-md">
              {tag}
            </span>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={() => onSelect(template)}>
          View
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TemplateCard;
