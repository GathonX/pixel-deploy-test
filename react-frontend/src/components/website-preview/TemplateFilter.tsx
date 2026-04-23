
import React from "react";
import { Button } from "@/components/ui/button";

interface TemplateFilterProps {
  categories: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
}

const TemplateFilter: React.FC<TemplateFilterProps> = ({ 
  categories, 
  selectedCategory, 
  onCategoryChange 
}) => {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant={selectedCategory === "all" ? "default" : "outline"}
        size="sm"
        onClick={() => onCategoryChange("all")}
      >
        All
      </Button>
      
      {categories.map((category) => (
        <Button
          key={category}
          variant={selectedCategory === category ? "default" : "outline"}
          size="sm"
          onClick={() => onCategoryChange(category)}
        >
          {category.charAt(0).toUpperCase() + category.slice(1)}
        </Button>
      ))}
    </div>
  );
};

export default TemplateFilter;
