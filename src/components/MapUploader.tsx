import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface MapUploaderProps {
  eventId: string;
}

export function MapUploader({ eventId }: MapUploaderProps) {
  const [mapUrl, setMapUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchMap();
  }, [eventId]);

  const fetchMap = async () => {
    const { data, error } = await supabase
      .from('maps')
      .select('image_url')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!error && data) {
      setMapUrl(data.image_url);
    }
    setLoading(false);
  };

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

    setUploading(true);

    try {
      // Upload to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `map-${eventId}-${Date.now()}.${fileExt}`;
      const { error: uploadError, data: uploadData } = await supabase.storage
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

      // Delete old map from storage if exists
      if (mapUrl) {
        const oldFileName = mapUrl.split('/').pop();
        if (oldFileName) {
          await supabase.storage
            .from('event-images')
            .remove([oldFileName]);
        }
      }

      // Save to database
      let dbError;
      if (mapUrl) {
        // Update existing map
        const result = await supabase
          .from('maps')
          .update({ image_url: publicUrl })
          .eq('event_id', eventId);
        dbError = result.error;
      } else {
        // Insert new map
        const result = await supabase
          .from('maps')
          .insert({ event_id: eventId, image_url: publicUrl });
        dbError = result.error;
      }

      if (dbError) throw dbError;

      setMapUrl(publicUrl);
      toast.success('Kart lastet opp!');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error('Kunne ikke laste opp kart: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div>Laster...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Kart</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {mapUrl ? (
          <div className="space-y-4">
            <div className="border rounded-lg overflow-hidden">
              <img
                src={mapUrl}
                alt="Arrangement kart"
                className="w-full max-w-md mx-auto"
              />
            </div>
            <p className="text-sm text-muted-foreground">
              Filnavn: {mapUrl.split('/').pop()}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Ingen kart lastet opp</p>
        )}
        
        <div>
          <input
            type="file"
            id="map-upload"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            onChange={handleFileUpload}
            className="hidden"
            disabled={uploading}
          />
          <Button
            onClick={() => document.getElementById('map-upload')?.click()}
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
                {mapUrl ? 'Last opp nytt kart' : 'Last opp kart'}
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            PNG, JPG, JPEG eller WebP. Maks 10MB.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
