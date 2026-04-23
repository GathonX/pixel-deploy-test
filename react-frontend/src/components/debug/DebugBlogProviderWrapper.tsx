// src/components/debug/DebugBlogProviderWrapper.tsx

import React, { useEffect } from "react";
import { useBlog } from "@/contexts/BlogContext";

interface DebugBlogProviderWrapperProps {
  children: React.ReactNode;
  pageName: string;
}

export const DebugBlogProviderWrapper: React.FC<DebugBlogProviderWrapperProps> = ({ 
  children, 
  pageName 
}) => {
  const { posts } = useBlog();

  useEffect(() => {
    console.log(`[${pageName}] DebugBlogProviderWrapper - Posts dans le contexte:`, {
      count: posts.length,
      posts: posts.map(p => ({
        id: p.id,
        title: p.title,
        likes: p.likes,
        views: p.views,
        sharesCount: p.sharesCount
      }))
    });
  }, [posts, pageName]);

  // Log lors du montage
  useEffect(() => {
    console.log(`[${pageName}] DebugBlogProviderWrapper monté - Contexte disponible`);
  }, [pageName]);

  return <>{children}</>;
};