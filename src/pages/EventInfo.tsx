import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, Maximize2 } from 'lucide-react';
import parse from 'html-react-parser';

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

interface InfoSection {
  id: string;
  title: string;
  content: string | null;
  image_url: string | null;
}

export default function EventInfo() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [sections, setSections] = useState<InfoSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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
      
      const { data: infoData } = await supabase
        .from('info_sections')
        .select('*')
        .eq('event_id', eventData.id)
        .order('order_index', { ascending: true });

      setSections((infoData as InfoSection[]) || []);
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
          <h1 className="text-lg font-semibold">Praktisk info</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {sections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ingen informasjon tilgjengelig
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {sections.map((section) => (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                </CardHeader>
                {(section.content || section.image_url) && (
                  <CardContent className="pt-0 space-y-4">
                    {section.content && (
                      <div className="prose prose-sm max-w-none">
                        {parse(section.content)}
                      </div>
                    )}
                    {section.image_url && (
                      <div className="relative group">
                        <img
                          src={section.image_url}
                          alt={section.title}
                          className="w-full h-auto rounded-lg cursor-zoom-in"
                          onClick={() => setLightboxImage(section.image_url)}
                        />
                        <Button
                          variant="secondary"
                          size="icon"
                          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => setLightboxImage(section.image_url)}
                        >
                          <Maximize2 className="h-4 w-4" />
                        </Button>
                        <p className="text-xs text-muted-foreground text-center mt-2">
                          Klikk på bildet for å zoome
                        </p>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxImage} onOpenChange={() => setLightboxImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0">
          {lightboxImage && (
            <div className="overflow-auto w-full h-full">
              <img
                src={lightboxImage}
                alt="Forstørret visning"
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
