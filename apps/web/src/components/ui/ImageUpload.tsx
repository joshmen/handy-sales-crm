'use client';

import React, { useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Camera, Upload, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// --- Variante circular (avatares, logos) ---
interface AvatarUploadProps {
  variant: 'avatar';
  src?: string | null;
  alt?: string;
  fallback?: string;
  fallbackClassName?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  accept?: string;
  maxSizeMB?: number;
  hint?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<unknown> | void;
  onDelete?: () => Promise<unknown> | void;
}

// --- Variante cuadrada (productos, inventario) ---
interface SquareUploadProps {
  variant: 'square';
  src?: string | null;
  alt?: string;
  fallbackIcon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  accept?: string;
  maxSizeMB?: number;
  hint?: string;
  disabled?: boolean;
  onUpload: (file: File) => Promise<unknown> | void;
  onDelete?: () => Promise<unknown> | void;
}

export type ImageUploadProps = AvatarUploadProps | SquareUploadProps;

const sizeMap = {
  sm: { container: 'h-12 w-12', text: 'text-sm', btn: 'p-1', icon: 'h-3 w-3', deleteIcon: 'h-2.5 w-2.5' },
  md: { container: 'h-16 w-16', text: 'text-lg', btn: 'p-1.5', icon: 'h-3.5 w-3.5', deleteIcon: 'h-3 w-3' },
  lg: { container: 'h-24 w-24', text: 'text-2xl', btn: 'p-1.5', icon: 'h-4 w-4', deleteIcon: 'h-3.5 w-3.5' },
  xl: { container: 'h-28 w-28', text: 'text-3xl', btn: 'p-2', icon: 'h-4 w-4', deleteIcon: 'h-3.5 w-3.5' },
};

export function ImageUpload(props: ImageUploadProps) {
  const {
    src,
    alt = '',
    size = 'md',
    accept = 'image/*',
    maxSizeMB = 2,
    hint,
    disabled = false,
    onUpload,
    onDelete,
  } = props;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const s = sizeMap[size];
  const hasImage = !!src;

  const handleClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      // Import toast dynamically to avoid circular deps
      const { toast } = await import('@/hooks/useToast');
      toast({
        title: 'Archivo muy grande',
        description: `El archivo no debe superar ${maxSizeMB}MB`,
        variant: 'destructive',
      });
      return;
    }

    await onUpload(file);
    // Reset so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async () => {
    if (onDelete) await onDelete();
  };

  // Hidden file input (shared)
  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept={accept}
      onChange={handleFileChange}
      className="hidden"
    />
  );

  // Upload button (green, absolute bottom-right)
  const uploadButton = (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={cn(
        'absolute bottom-0 right-0 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 shadow-md ring-2 ring-white dark:ring-gray-900',
        s.btn,
      )}
      title={hasImage ? 'Cambiar imagen' : 'Subir imagen'}
    >
      {hasImage ? <Camera className={s.icon} /> : <Upload className={s.icon} />}
    </button>
  );

  // Delete hint row (text + trash icon inline, below the image)
  const hintRow = (hint || (hasImage && onDelete)) ? (
    <div className="flex items-center gap-2 mt-2">
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {hasImage && onDelete && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={disabled}
          className="text-red-500 hover:text-red-600 transition-colors disabled:opacity-50"
          title="Eliminar imagen"
        >
          <Trash2 className={s.deleteIcon} />
        </button>
      )}
    </div>
  ) : null;

  // --- AVATAR variant ---
  if (props.variant === 'avatar') {
    const { fallback = '', fallbackClassName } = props;
    return (
      <div className="flex flex-col items-center shrink-0">
        <div className="relative">
          <Avatar className={cn(s.container, 'ring-2 ring-border')}>
            <AvatarImage src={src || undefined} alt={alt} />
            <AvatarFallback className={cn('font-semibold', s.text, fallbackClassName)}>
              {fallback}
            </AvatarFallback>
          </Avatar>
          {fileInput}
          {uploadButton}
        </div>
        {hintRow}
      </div>
    );
  }

  // --- SQUARE variant ---
  const { fallbackIcon } = props;
  return (
    <div className="flex flex-col items-center shrink-0">
      <div className="relative">
        <div className={cn(s.container, 'rounded-lg border border-border flex items-center justify-center overflow-hidden bg-muted/50')}>
          {src ? (
            <img src={src} alt={alt} className="w-full h-full object-cover" />
          ) : (
            fallbackIcon || <Upload className="w-8 h-8 text-muted-foreground/40" />
          )}
        </div>
        {fileInput}
        {uploadButton}
      </div>
      {hintRow}
    </div>
  );
}
