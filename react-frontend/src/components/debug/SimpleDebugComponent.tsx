// src/components/debug/SimpleDebugComponent.tsx

import React from "react";
import { useBlog } from "@/contexts/BlogContext";

export const SimpleDebugComponent: React.FC = () => {
  // ✅ Appeler le Hook AVANT le try-catch
  const { posts } = useBlog();

  try {
    console.log(`[SimpleDebugComponent] Contexte disponible - posts:`, posts.length);
    
    return (
      <div 
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          background: "rgba(0,0,0,0.8)",
          color: "white",
          padding: "8px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 9999
        }}
      >
        BlogContext: {posts.length} posts
      </div>
    );
  } catch (error) {
    console.error(`[SimpleDebugComponent] Erreur contexte:`, error);
    
    return (
      <div 
        style={{
          position: "fixed",
          top: "10px",
          right: "10px",
          background: "red",
          color: "white",
          padding: "8px",
          borderRadius: "4px",
          fontSize: "12px",
          zIndex: 9999
        }}
      >
        BlogContext: ERROR
      </div>
    );
  }
};