import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface Event {
  id: string;
  slug: string;
  name: string;
  enable_program: boolean;
  enable_participants: boolean;
  enable_exhibitors: boolean;
  enable_map: boolean;
  enable_info: boolean;
}

interface MapData {
  image_url: string;
}

export default function EventMap() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [mapData, setMapData] = useState<MapData | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (eventData) {
      setEvent(eventData);
      
      const { data: mapDataResult } = await supabase
        .from('maps')
        .select('image_url')
        .eq('event_id', eventData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (mapDataResult) {
        setMapData(mapDataResult);
      }
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laster...</div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Arrangement ikke funnet</div>;
  }

  return (
    <div className="min-h-screen bg-secondary/20 pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/events/${slug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <MEFLogo className="h-8" />
          <h1 className="text-lg font-semibold">Kart</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {!mapData ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ingen kart lastet opp ennå
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <Card className="overflow-hidden">
              <div className="relative group">
                <img
                  src={mapData.image_url}
                  alt="Områdekart"
                  className="w-full h-auto cursor-zoom-in"
                  onClick={() => setFullscreen(true)}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setFullscreen(true)}
                >
                  <Maximize2 className="h-5 w-5" />
                </Button>
              </div>
            </Card>
            <p className="text-sm text-muted-foreground text-center mt-3">
              Klikk på kartet for å zoome
            </p>
          </div>
        )}
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          {mapData && (
            <div className="overflow-auto w-full h-full">
              <img
                src={mapData.image_url}
                alt="Områdekart"
                className="w-full h-auto"
                style={{ minHeight: '100%' }}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <BottomNav 
        eventSlug={slug!} 
        modules={{
          program: event.enable_program,
          participants: event.enable_participants,
          exhibitors: event.enable_exhibitors,
          map: event.enable_map,
          info: event.enable_info,
        }}
      />
    </div>
  );
}
