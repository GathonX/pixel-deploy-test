import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { LucideIcon, Settings, Plus, BarChart3, Calendar, ChevronDown } from "lucide-react";

interface SocialMediaPlatformCardProps {
  platform: string;
  icon: LucideIcon;
  count: number;
  color: string;
  slug: string;
  onManage: (action: string, platformSlug: string) => void;
}

export const SocialMediaPlatformCard: React.FC<SocialMediaPlatformCardProps> = ({
  platform,
  icon: Icon,
  count,
  color,
  slug,
  onManage
}) => {
  return (
    <Card className={`border-l-4 ${color} hover:shadow-md transition-shadow cursor-pointer`}>
      <CardContent className="p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${color.replace('border', 'bg').replace('-500', '-100')}`}>
              <Icon className={`h-5 w-5 ${color.replace('border', 'text')}`} />
            </div>
            <div>
              <h3 className="font-medium">{platform}</h3>
              <p className="text-sm text-muted-foreground">{count} publications</p>
            </div>
          </div>
          
          {/* ✅ NOUVEAU : Dropdown menu avec actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="flex items-center gap-1">
                Gérer
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Actions {platform}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onManage('filter', slug)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Voir tous les posts
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onManage('create', slug)} className="hidden">
                <Plus className="h-4 w-4 mr-2" />
                Créer un post
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onManage('schedule', slug)}>
                <Calendar className="h-4 w-4 mr-2" />
                Programmer des posts
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onManage('analytics', slug)}>
                <BarChart3 className="h-4 w-4 mr-2" />
                Statistiques détaillées
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onManage('settings', slug)}>
                <Settings className="h-4 w-4 mr-2" />
                Paramètres plateforme
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
};