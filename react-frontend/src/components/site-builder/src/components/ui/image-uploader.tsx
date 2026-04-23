import { useState, useRef } from 'react';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { useSiteBuilderUpload } from '../../contexts/SiteBuilderUploadContext';

interface ImageUploaderProps {
  value: string;
  onChange: (url: string) => void;
  placeholder?: string;
  /** Optional label override */
  label?: string;
}

export function ImageUploader({ value, onChange, placeholder, label }: ImageUploaderProps) {
  const siteId = useSiteBuilderUpload();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so the same file can be re-selected after clearing
    if (inputRef.current) inputRef.current.value = '';

    setError(null);

    if (!file.type.startsWith('image/')) {
      setError('Fichier non supporté. Utilisez JPG, PNG, GIF ou WebP.');
      return;
    }

    const maxMB = 10;
    if (file.size > maxMB * 1024 * 1024) {
      setError(`Image trop grande. Maximum ${maxMB} Mo.`);
      return;
    }

    setIsUploading(true);

    if (siteId) {
      // ── Server upload → returns a permanent public URL ──
      try {
        const formData = new FormData();
        formData.append('image', file);
        const res = await axios.post(
          `/api/site-builder/sites/${siteId}/upload-image`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
        if (res.data?.success && res.data?.data?.url) {
          onChange(res.data.data.url);
        } else {
          setError('Erreur lors de l\'upload. Réessayez.');
        }
      } catch (err: any) {
        const msg = err?.response?.data?.message || 'Erreur réseau lors de l\'upload.';
        setError(msg);
      } finally {
        setIsUploading(false);
      }
    } else {
      // ── Fallback: base64 (editor outside site context) ──
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError('Impossible de lire le fichier.');
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-2">
      {/* Image preview */}
      {value && (
        <div className="relative w-full h-28 bg-muted rounded-lg overflow-hidden border">
          <img
            src={value}
            alt="Aperçu"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6 shadow"
            onClick={() => { onChange(''); setError(null); }}
            title="Supprimer l'image"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Input row: URL field + Upload button */}
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => { onChange(e.target.value); setError(null); }}
          placeholder={placeholder || "URL ou uploadez depuis votre ordinateur"}
          className="flex-1 text-xs"
        />
        <label className="cursor-pointer shrink-0" title="Uploader depuis l'ordinateur">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            asChild
            disabled={isUploading}
            className="h-9 w-9"
          >
            <span>
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </span>
          </Button>
        </label>
      </div>

      {/* Drop zone when no image */}
      {!value && (
        <label className="cursor-pointer block">
          <input
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            className="hidden"
            onChange={handleFileSelect}
            disabled={isUploading}
          />
          <div className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-4 px-3 text-muted-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors text-center">
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            ) : (
              <ImageIcon className="w-5 h-5 opacity-50" />
            )}
            <span className="text-xs">
              {isUploading ? 'Upload en cours…' : 'Cliquez ou glissez une image ici'}
            </span>
          </div>
        </label>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">{error}</p>
      )}
    </div>
  );
}
