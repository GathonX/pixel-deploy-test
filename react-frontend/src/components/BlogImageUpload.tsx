// react-frontend/src/components/BlogImageUpload.tsx
// ✅ VERSION CORRIGÉE - Affichage des images fixé

import React, { useState, useRef, ChangeEvent } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/services/api'
import axios from 'axios'
import { Upload, Image as ImageIcon, X, Loader2 } from 'lucide-react'

interface BlogImageUploadProps {
  /** Image actuelle (URL complète ou path relatif) */
  currentImage?: string
  /** Callback quand l'upload réussit - reçoit le path relatif */
  onUploadSuccess: (path: string, fullUrl: string) => void
  /** Callback pour supprimer l'image */
  onRemove?: () => void
  /** Texte du bouton (optionnel) */
  buttonText?: string
  /** Classe CSS additionnelle */
  className?: string
}

const BlogImageUpload: React.FC<BlogImageUploadProps> = ({
  currentImage,
  onUploadSuccess,
  onRemove,
  buttonText = "Ajouter une image",
  className = "",
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  // ✅ CORRECTION : Construction URL complète améliorée
  const getImageUrl = (image?: string): string | undefined => {
    if (!image || image.trim() === '') return undefined
    
    // Si c'est déjà une URL complète (http/https)
    if (image.startsWith('http://') || image.startsWith('https://')) {
      return image
    }
    
    // Si c'est une image base64
    if (image.startsWith('data:image/')) {
      return image
    }
    
    // Si c'est un path relatif, construire l'URL complète
    return `${import.meta.env.VITE_API_URL}/storage/${image}`
  }

  const handleButtonClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // ✅ Validation fichier
    const maxSize = 5 * 1024 * 1024 // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: 'Format non supporté',
        description: 'Utilisez JPG, PNG, WebP ou GIF.',
        variant: 'destructive',
      })
      return
    }

    if (file.size > maxSize) {
      toast({
        title: 'Fichier trop volumineux',
        description: 'Taille maximum : 5MB.',
        variant: 'destructive',
      })
      return
    }

    setUploading(true)

    const { id, update, dismiss } = toast({
      title: 'Upload en cours',
      description: 'Envoi de l\'image...',
      variant: 'default',
    })

    // ✅ FormData identique au système ProfileAvatar
    const formData = new FormData()
    formData.append('image', file) // Note: 'image' pas 'avatar'

    try {
      // ✅ Endpoint principal : /blog/upload-image
      const response = await api.post('/blog/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // ✅ Structure de réponse identique au ProfileAvatar
      if (response.data.success && response.data.data?.path) {
        const path = response.data.data.path
        const fullUrl = `${import.meta.env.VITE_API_URL}/storage/${path}`

        update({
          id,
          title: 'Image uploadée',
          description: 'L\'image a été ajoutée avec succès.',
          variant: 'default',
        })

        onUploadSuccess(path, fullUrl)
      } else {
        throw new Error('Réponse serveur invalide')
      }

    } catch (err: unknown) {
      // ✅ Fallback base64 si endpoint pas encore créé
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        console.log('Endpoint /blog/upload-image pas encore créé, fallback base64')
        
        try {
          const reader = new FileReader()
          reader.onload = (event) => {
            const base64 = event.target?.result as string
            update({
              id,
              title: 'Image chargée (temporaire)',
              description: 'Image en base64 - endpoint Laravel à créer.',
              variant: 'default',
            })
            onUploadSuccess('temp-base64', base64)
          }
          reader.readAsDataURL(file)
        } catch (base64Error) {
          update({
            id,
            title: 'Erreur',
            description: 'Erreur lors du traitement de l\'image.',
            variant: 'destructive',
          })
        }
      } else {
        // ✅ Gestion erreurs standard
        const message = axios.isAxiosError(err) 
          ? err.response?.data?.message || "Erreur lors de l'upload."
          : 'Erreur inattendue.'
        
        update({
          id,
          title: 'Erreur',
          description: message,
          variant: 'destructive',
        })
        console.error('Erreur upload image blog:', err)
      }
    } finally {
      setUploading(false)
      setTimeout(() => dismiss(), 3000)
      // Reset input
      e.target.value = ''
    }
  }

  // ✅ CORRECTION : Calculer l'URL une seule fois
  const imageUrl = getImageUrl(currentImage)
  
  // ✅ DEBUG : Log pour diagnostiquer
  console.log('🔍 [BlogImageUpload] Debug:', {
    currentImage,
    imageUrl,
    hasImage: !!imageUrl
  })

  return (
    <div className={`space-y-4 ${className}`}>
      {/* ✅ CORRECTION : Aperçu image actuelle */}
      {imageUrl && (
        <div className="relative inline-block w-full">
          <img
            src={imageUrl}
            alt="Image du blog"
            className="max-w-full h-48 w-full object-cover rounded-lg border"
            onLoad={() => console.log('✅ Image chargée:', imageUrl)}
            onError={(e) => {
              console.error('❌ Erreur chargement image:', imageUrl)
              // ✅ CORRECTION : Fallback plus robuste
              e.currentTarget.src = "data:image/svg+xml,%3csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100' height='100' fill='%23f3f4f6'/%3e%3ctext x='50' y='50' font-size='14' text-anchor='middle' dy='.3em' fill='%23909399'%3eImage%3c/text%3e%3c/svg%3e"
              e.currentTarget.alt = "Image non disponible"
            }}
          />
          {onRemove && (
            <Button
              size="sm"
              variant="destructive"
              className="absolute top-2 right-2"
              onClick={onRemove}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* ✅ Boutons d'action */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleButtonClick}
          disabled={uploading}
          className="flex items-center gap-2"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : imageUrl ? (
            <ImageIcon className="h-4 w-4" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          {uploading ? 'Upload...' : (imageUrl ? 'Changer l\'image' : buttonText)}
        </Button>
        
        {/* ✅ NOUVEAU : Bouton de suppression distinct */}
        {imageUrl && onRemove && (
          <Button
            type="button"
            variant="outline"
            onClick={onRemove}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Supprimer
          </Button>
        )}
      </div>

      {/* ✅ NOUVEAU : Placeholder si pas d'image */}
      {!imageUrl && (
        <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Aucune image sélectionnée</p>
            <p className="text-xs text-gray-400">Cliquez sur "Ajouter une image" pour commencer</p>
          </div>
        </div>
      )}

      {/* ✅ Input file caché */}
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  )
}

export default BlogImageUpload