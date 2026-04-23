import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AuthorSuggestions } from "./AuthorSuggestions";
import { Badge } from "@/components/ui/badge";
import { Users, UserPlus, Lock } from "lucide-react";

interface SidebarAuthorsProps {
  isMobile: boolean;
  following: string[];
  onFollowToggle: (authorId: string) => void;
  currentUserId: string;
  isAuthenticated: boolean;
  onAuthorClick?: (authorId: number | string) => void;
}

export function SidebarAuthors({
  isMobile,
  following,
  onFollowToggle,
  currentUserId,
  isAuthenticated,
  onAuthorClick
}: SidebarAuthorsProps) {
  // Desktop version
  if (!isMobile) {
    return (
      <div className="hidden lg:block">
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
          <CardContent className="p-0">
            {/* Header moderne */}
            <div className="p-6 bg-gradient-to-r from-white/50 to-slate-50/30 border-b border-slate-100">
              <div className="flex items-center gap-3 mb-2">
                {isAuthenticated ? (
                  <Users className="h-5 w-5 text-brand-blue" />
                ) : (
                  <Lock className="h-5 w-5 text-orange-500" />
                )}
                <h3 className="font-semibold text-slate-800">Auteurs suggérés</h3>
              </div>
              {isAuthenticated ? (
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-xs">
                    {following.length} abonnements
                  </Badge>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Connectez-vous pour suivre vos auteurs préférés</p>
              )}
            </div>
            <div className="p-6">
              <AuthorSuggestions
                key="author-suggestions-desktop"
                following={following}
                onFollowToggle={onFollowToggle}
                isAuthenticated={isAuthenticated}
                onAuthorClick={onAuthorClick}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mobile version
  return (
    <div className="lg:hidden mt-6">
      <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="p-4 bg-gradient-to-r from-white/50 to-slate-50/30 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              {isAuthenticated ? (
                <Users className="h-4 w-4 text-brand-blue" />
              ) : (
                <Lock className="h-4 w-4 text-orange-500" />
              )}
              <h3 className="font-semibold text-slate-800 text-sm">Suggestions</h3>
            </div>
            {isAuthenticated && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white border-0 text-xs">
                {following.length} abonnements
              </Badge>
            )}
          </div>
          <div className="p-4">
            <AuthorSuggestions
              key="author-suggestions-mobile"
              following={following}
              onFollowToggle={onFollowToggle}
              isAuthenticated={isAuthenticated}
              onAuthorClick={onAuthorClick}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}