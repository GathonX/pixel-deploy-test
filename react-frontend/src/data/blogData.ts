import { BlogPost } from '@/services/blogService';
import { getUniformAvatarUrl } from '@/hooks/useProfileListener'; // ✅ IMPORT UNIFORME


// ===== INTERFACES BACKEND UNIQUEMENT =====

export interface Author {
  id: string | number;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  articles: number;
  likes: number;
  comments: number;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Comment {
  id: string | number;
  author?: Author;
  content: string;
  date?: string;
  likes: number;
  replies?: Comment[];
  user_id?: number;
  commentable_type?: string;
  commentable_id?: number;
  likes_count?: number;
  parent_id?: number | null;
  created_at?: string;
  updated_at?: string;
  user?: {
    id: number;
    name: string;
    email: string;
    avatar?:string;
  };
}

export interface BlogCategory {
  id: string | number;
  name: string;
  slug: string;
  count?: number;
  description?: string;
  color?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  pivot?: {
    blog_post_id: number;
    category_id: number;
  };
}

export interface SocialMediaPlatform {
  id: string | number;
  name: string;
  icon: string;
  color: string;
  slug: string;
  key?: string;
  character_limit?: number;
  supports_images?: boolean;
  supports_video?: boolean;
  max_images?: number;
  hashtag_limit?: number;
}

export interface SocialMediaPost {
  id: string | number;
  platform: string;
  content: string;
  images?: string[];
  video?: string;
  author?: Author;
  publishDate?: string;
  published_at?: string | null;
  status?: "draft" | "scheduled" | "published";
  time?: string;
  scheduled_time?: string | null;
  likes: number;
  comments: number;
  shares: number;
  views: number;
  isAIGenerated?: boolean;
  is_ai_generated?: boolean;
  tags: string[];
  user_id?: number;
  user?: {
    id: number;
    name: string;
    email: string;
  };
  generation_context?: {
    domain: string;
    user_id: number;
    platform: string;
    tasks_count: number;
    projects_count: number;
    generated_at: string;
  } | null;
  created_at?: string;
  updated_at?: string;
  categories?: SocialMediaCategory[];
}


export interface BlogCalendarPost {
  id: number;
  title: string;
  summary: string;
  content: string;
  scheduled_date: string;
  scheduled_time: string;
  status: "draft" | "scheduled" | "published";
  header_image: string;
  tags: string[];
  categories: string[]; // ✅ CORRECTION : string[] au lieu de BlogCategory[]
  created_at: string;
  published_at: string;
  author: {
    id: number;
    name: string;
    avatar?: string;
  };
}

export interface SocialMediaCategory {
  id: string | number;
  name: string;
  slug: string;
  description?: string;
  color?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  pivot?: {
    social_media_post_id: number;
    category_id: number;
  };
}

export type Category = BlogCategory;

// ===== FONCTIONS UTILITAIRES POUR GÉRER LES TYPES =====

/**
 * Obtenir le nombre de commentaires d'un post
 */
export const getCommentsCount = (post: BlogPost): number => {
  if (typeof post.comments === 'number') return post.comments;
  if (Array.isArray(post.comments)) return post.comments.length;
  return 0;
};

/**
 * Obtenir les commentaires d'un post
 */
export const getCommentsArray = (post: BlogPost): Comment[] => {
  if (Array.isArray(post.comments)) return post.comments;
  return [];
};



/**
 * ✅ CORRECTION AVATAR : Adapter un commentaire backend vers le format frontend
 * PROBLÈME RÉSOLU : Utilise maintenant getUniformAvatarUrl pour tous les avatars
 */
export const adaptCommentForFrontend = (backendComment: any): Comment => {
  return {
    id: backendComment.id?.toString() || backendComment.id,
    date: backendComment.created_at || backendComment.date || new Date().toISOString(),
    likes: Number(backendComment.likes_count) || Number(backendComment.likes) || 0,
    content: backendComment.content || '',
    
    // ✅ CORRECTION CRITIQUE : Author avec avatar uniforme
    author: backendComment.user
      ? {
          id: backendComment.user.id?.toString() || backendComment.user.id,
          name: backendComment.user.name || 'Anonyme',
          avatar: getUniformAvatarUrl(backendComment.user.avatar), // ✅ UTILISE FONCTION UNIFORME
          bio: backendComment.user.bio || 'Utilisateur Pixel Rise',
          followers: Number(backendComment.user.followers) || 0,
          articles: Number(backendComment.user.articles) || 0,
          likes: Number(backendComment.user.likes) || 0,
          comments: Number(backendComment.user.comments) || 0,
          email: backendComment.user.email || undefined,
          created_at: backendComment.user.created_at || undefined,
          updated_at: backendComment.user.updated_at || undefined
        }
      : undefined,
    
    // ✅ CORRECTION CRITIQUE : User avec avatar uniforme
    user: backendComment.user
      ? {
          id: Number(backendComment.user.id),
          name: backendComment.user.name || 'Anonyme',
          email: backendComment.user.email || '',
          avatar: getUniformAvatarUrl(backendComment.user.avatar) // ✅ UTILISE FONCTION UNIFORME
        }
      : undefined,
    
    replies: Array.isArray(backendComment.replies) ? backendComment.replies.map(adaptCommentForFrontend) : [],
    parent_id: backendComment.parent_id ? Number(backendComment.parent_id) : null,
    user_id: backendComment.user_id ? Number(backendComment.user_id) : undefined,
    commentable_type: backendComment.commentable_type || undefined,
    commentable_id: backendComment.commentable_id ? Number(backendComment.commentable_id) : undefined,
    likes_count: Number(backendComment.likes_count) || Number(backendComment.likes) || 0,
    created_at: backendComment.created_at || new Date().toISOString(),
    updated_at: backendComment.updated_at || new Date().toISOString()
  };
};

/**
 * ✅ CORRECTION AVATAR : Adapter un BlogPost backend vers le format frontend
 * PROBLÈME RÉSOLU : Utilise maintenant getUniformAvatarUrl pour tous les avatars
 */
export function adaptBlogPostForFrontend(rawPost: any): BlogPost {
  return {
    id: Number(rawPost.id),
    user_id: Number(rawPost.user_id),
    slug: rawPost.slug || '',
    title: rawPost.title || '',
    summary: rawPost.summary || '',
    content: rawPost.content || '',
    header_image: rawPost.header_image || undefined,
    status: rawPost.status as 'draft' | 'scheduled' | 'published',
    published_at: rawPost.published_at || null,
    scheduled_at: rawPost.scheduled_at || null, // ✅ AJOUTÉ : Date/heure de publication programmée
    scheduled_time: rawPost.scheduled_time || null,
    created_at: rawPost.created_at || new Date().toISOString(),
    updated_at: rawPost.updated_at || new Date().toISOString(),
    views: Number(rawPost.views) || 0,
    
    // ✅ CORRECTION CRITIQUE : Utiliser les vraies données de reactions
    likes: Number(rawPost.likes_count) || Number(rawPost.likes) || 0,
    shares: Number(rawPost.shares_count) || Number(rawPost.shares) || 0,
    
    // ✅ CORRECTION AVATAR : Commentaires avec avatar uniforme
    comments: Array.isArray(rawPost.comments)
      ? rawPost.comments.map((comment: any) => ({
          id: Number(comment.id),
          content: comment.content || '',
          user: comment.user
            ? { 
                id: Number(comment.user.id), 
                name: comment.user.name, 
                email: comment.user.email || '',
                avatar: getUniformAvatarUrl(comment.user.avatar) // ✅ UTILISE FONCTION UNIFORME
              }
            : { id: 0, name: 'Anonyme', email: '', avatar: getUniformAvatarUrl(null) }, // ✅ UTILISE FONCTION UNIFORME
          parent_id: comment.parent_id ? Number(comment.parent_id) : undefined,
          created_at: comment.created_at || new Date().toISOString(),
          updated_at: comment.updated_at || new Date().toISOString(),
          likes: Number(comment.likes_count) || 0
        }))
      : Number(rawPost.comments_count) || 0,
    
    categories: Array.isArray(rawPost.categories)
      ? rawPost.categories.map((cat: any) => ({
          id: Number(cat.id),
          name: cat.name || '',
          slug: cat.slug || '',
          description: cat.description || '',
          color: cat.color || '',
          is_active: !!cat.is_active,
          created_at: cat.created_at || new Date().toISOString(),
          updated_at: cat.updated_at || new Date().toISOString(),
          pivot: cat.pivot ? { blog_post_id: Number(cat.pivot.blog_post_id), category_id: Number(cat.pivot.category_id) } : undefined
        }))
      : [],
    
    // ✅ CORRECTION AVATAR : User avec avatar uniforme
    user: rawPost.user
      ? { 
          id: Number(rawPost.user.id), 
          name: rawPost.user.name, 
          email: rawPost.user.email || '',
          avatar: getUniformAvatarUrl(rawPost.user.avatar) // ✅ UTILISE FONCTION UNIFORME
        }
      : { id: 0, name: 'Anonyme', email: '', avatar: getUniformAvatarUrl(null) }, // ✅ UTILISE FONCTION UNIFORME
    
    is_ai_generated: !!rawPost.is_ai_generated,
    generation_context: rawPost.generation_context
      ? {
          domain: rawPost.generation_context.domain || '',
          user_id: Number(rawPost.generation_context.user_id) || 0,
          tasks_count: Number(rawPost.generation_context.tasks_count) || 0,
          projects_count: Number(rawPost.generation_context.projects_count) || 0,
          generated_at: rawPost.generation_context.generated_at || new Date().toISOString()
        }
      : null,
    tags: Array.isArray(rawPost.tags) ? rawPost.tags : []
  };
}


// ===== COMPATIBILITÉ : Exports pour les anciens fichiers =====

/**
 * @deprecated Utilisez les données du backend via blogService
 */
export const authors: Author[] = [];

/**
 * @deprecated Utilisez les données du backend via blogService
 */
export const blogPosts: BlogPost[] = [];

/**
 * @deprecated Utilisez les données du backend via categoryService
 */
export const categories: BlogCategory[] = [];

/**
 * @deprecated Utilisez les données du backend via socialMediaService
 */
export const socialMediaPosts: SocialMediaPost[] = [];

/**
 * @deprecated Utilisez les données du backend via socialMediaService
 */
export const socialMediaPlatforms: SocialMediaPlatform[] = [
  {
    id: "1",
    name: "Facebook",
    icon: "facebook",
    color: "border-blue-500",
    slug: "facebook",
    key: "facebook",
    character_limit: 63206,
    supports_images: true,
    supports_video: true,
    max_images: 10
  },
  {
    id: "2",
    name: "Instagram",
    icon: "instagram",
    color: "border-pink-500",
    slug: "instagram",
    key: "instagram",
    character_limit: 2200,
    supports_images: true,
    supports_video: true,
    max_images: 10
  },
  {
    id: "3",
    name: "Twitter",
    icon: "twitter",
    color: "border-blue-400",
    slug: "twitter",
    key: "twitter",
    character_limit: 280,
    supports_images: true,
    supports_video: true,
    max_images: 4
  },
  {
    id: "4",
    name: "LinkedIn",
    icon: "linkedin",
    color: "border-blue-700",
    slug: "linkedin",
    key: "linkedin",
    character_limit: 3000,
    supports_images: true,
    supports_video: true,
    max_images: 9
  },
  {
    id: "5",
    name: "YouTube",
    icon: "youtube",
    color: "border-red-500",
    slug: "youtube",
    key: "youtube",
    character_limit: 5000,
    supports_images: true,
    supports_video: true,
    max_images: 1
  }
];

/**
 * @deprecated Utilisez les données du backend via blogService
 */
export default blogPosts;