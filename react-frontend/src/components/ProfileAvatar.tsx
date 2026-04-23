import React, { useState, useRef, ChangeEvent, useEffect } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import api from '@/services/api'
import axios from 'axios'

// Chemin de votre avatar par défaut
const DEFAULT_AVATAR = 'https://github.com/shadcn.png'

export interface ProfileAvatarProps {
  /** Chemin relatif de l'avatar en BDD, ex. "avatars/avatar_1_1234.jpg" */
  currentPath?: string
  onUploadSuccess: (newPath: string) => void
}

const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  currentPath,
  onUploadSuccess,
}) => {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Détermine l'URL complète : soit le path BDD, soit le default
  const computeUrl = (path?: string) => {
    if (path) {
      return `${import.meta.env.VITE_API_URL}/storage/${path}`
    }
    return DEFAULT_AVATAR
  }

  const [avatarUrl, setAvatarUrl] = useState<string>(computeUrl(currentPath))

  // Si currentPath change (après fetch user), on recalcule
  useEffect(() => {
    setAvatarUrl(computeUrl(currentPath))
  }, [currentPath])

  const handlePhotoClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { id, update, dismiss } = toast({
      title: 'Upload avatar',
      description: 'Envoi en cours…',
      variant: 'info',
    })

    const formData = new FormData()
    formData.append('avatar', file)

    try {
      const res = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const newPath: string = res.data.avatar

      update({
        id,
        title: 'Photo mise à jour',
        description: 'Votre photo de profil a été changée.',
        variant: 'success',
      })

      const fullUrl = `${import.meta.env.VITE_API_URL}/storage/${newPath}`
      setAvatarUrl(fullUrl)
      onUploadSuccess(newPath)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const msg = err.response?.data?.message || "Erreur lors de l'upload."
        update({ id, title: 'Erreur', description: msg, variant: 'destructive' })
      } else {
        update({
          id,
          title: 'Erreur',
          description: 'Erreur inattendue.',
          variant: 'destructive',
        })
        console.error(err)
      }
    } finally {
      setTimeout(() => dismiss(), 3000)
    }
  }

  return (
    <div className="flex flex-col items-center">
      <Avatar className="h-32 w-32">
        <AvatarImage 
          src={avatarUrl} 
          alt="Photo de profil"
          className="object-cover"
        />
        <AvatarFallback className="text-2xl">
          {/* Initiales de l'utilisateur comme fallback */}
          JM
        </AvatarFallback>
      </Avatar>
      <div className="mt-2">
        <Button size="sm" onClick={handlePhotoClick}>
          Changer la photo
        </Button>
      </div>
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

export default ProfileAvatar