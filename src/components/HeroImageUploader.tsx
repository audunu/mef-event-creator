import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Upload, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface HeroImageUploaderProps {
  eventId: string;
  currentImageUrl: string;
  onImageUpdate: (newUrl: string) => void;
}

export function HeroImageUploader({ eventId, currentImageUrl, onImageUpdate }: HeroImageUploaderProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Ugyldig filtype. Kun PNG, JPG, JPEG og WebP er tillatt.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Filen er for stor. Maksimal størrelse er 10MB.');
      return;
    }

    // Check image orientation (soft warning only)
    const img = new Image();
    img.onload = () => {
      const ratio = img.width / img.height;
      if (ratio < 1.0) {
        toast.warning('Tips: Landscape-bilder (liggende) ser best ut som hovedbilde');
      }
    };
    img.src = URL.createObjectURL(file);

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `hero-${eventId}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      // Delete old image from storage if exists
      if (currentImageUrl && currentImageUrl.includes('event-images')) {
        const oldFileName = currentImageUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('event-images')
            .remove([oldFileName]);
        }
      }

      // Update event with new image URL
      const { error: dbError } = await supabase
        .from('events')
        .update({ hero_image_url: publicUrl })
        .eq('id', eventId);

      if (dbError) throw dbError;

      onImageUpdate(publicUrl);
      toast.success('Hovedbilde lastet opp!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Kunne ikke laste opp bilde: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImageUrl) return;

    try {
      // Delete from storage if it's in our bucket
      if (currentImageUrl.includes('event-images')) {
        const fileName = currentImageUrl.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('event-images')
            .remove([fileName]);
        }
      }

      // Update event to remove image URL
      const { error } = await supabase
        .from('events')
        .update({ hero_image_url: null })
        .eq('id', eventId);

      if (error) throw error;

      onImageUpdate('');
      toast.success('Hovedbilde fjernet');
    } catch (error: any) {
      console.error('Remove error:', error);
      toast.error('Kunne ikke fjerne bilde: ' + error.message);
    }
  };

  return (
    <div className="space-y-4">
      {currentImageUrl && (
        <div className="space-y-2">
          <div className="border rounded-lg overflow-hidden bg-muted flex items-center justify-center" style={{ minHeight: '200px', maxHeight: '400px' }}>
            <img
              src={currentImageUrl}
              alt="Arrangement hovedbilde"
              className="w-full h-full object-contain max-h-[400px]"
            />
          </div>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {currentImageUrl.split('/').pop()}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveImage}
            >
              <X className="h-4 w-4 mr-1" />
              Fjern bilde
            </Button>
          </div>
        </div>
      )}
      
      <div>
        <input
          type="file"
          id="hero-upload"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <Button
          type="button"
          variant="outline"
          onClick={() => document.getElementById('hero-upload')?.click()}
          disabled={uploading}
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Laster opp...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              {currentImageUrl ? 'Last opp nytt bilde' : 'Last opp bilde'}
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground mt-2">
          PNG, JPG, JPEG eller WebP. Maks 10MB.<br />
          Tips: Landscape-bilder (1920x800 til 2400x1000 piksler) ser best ut.
        </p>
      </div>
    </div>
  );
}
