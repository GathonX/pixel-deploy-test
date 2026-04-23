
export interface WebsiteTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  thumbnail: string;
  tags: string[];
  previewUrl?: string;
  templateUrl?: string;
}

export const sampleTemplates: WebsiteTemplate[] = [
  {
    id: "1",
    name: "Blog Standard",
    description: "A clean blog template with modern design",
    category: "blog",
    thumbnail: "/placeholder.svg",
    tags: ["blog", "minimalist", "responsive"]
  },
  {
    id: "2",
    name: "Portfolio Basic",
    description: "Showcase your work with this portfolio template",
    category: "portfolio",
    thumbnail: "/placeholder.svg",
    tags: ["portfolio", "gallery", "responsive"]
  },
  {
    id: "3",
    name: "Business Pro",
    description: "Professional business website template",
    category: "business",
    thumbnail: "/placeholder.svg",
    tags: ["business", "professional", "services"]
  }
];
