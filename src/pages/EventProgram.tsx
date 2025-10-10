import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Clock, MapPin } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

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

interface ProgramItem {
  id: string;
  day: string;
  start_time: string;
  end_time: string | null;
  title: string;
  description: string | null;
  location: string | null;
}

export default function EventProgram() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProgramItem | null>(null);
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
      
      const { data: programData } = await supabase
        .from('program_items')
        .select('*')
        .eq('event_id', eventData.id)
        .order('day', { ascending: true })
        .order('start_time', { ascending: true });

      setItems(programData || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laster...</div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Arrangement ikke funnet</div>;
  }

  const groupedByDay = items.reduce((acc, item) => {
    const day = item.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<string, ProgramItem[]>);

  return (
    <div className="min-h-screen bg-secondary/20 pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/events/${slug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <MEFLogo className="h-8" />
          <h1 className="text-lg font-semibold">Program</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {Object.keys(groupedByDay).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ingen programposter ennå
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedByDay).map(([day, dayItems]) => (
              <div key={day}>
                <h2 className="text-xl font-bold mb-3">
                  {new Date(day).toLocaleDateString('nb-NO', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </h2>
                <div className="space-y-2">
                  {dayItems.map((item) => (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-[100px]">
                            <Clock className="h-4 w-4" />
                            {item.start_time.slice(0, 5)}
                            {item.end_time && ` - ${item.end_time.slice(0, 5)}`}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base">{item.title}</CardTitle>
                            {item.location && (
                              <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                <MapPin className="h-3 w-3" />
                                {item.location}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedItem.title}</DialogTitle>
                <div className="flex flex-col gap-2 text-sm text-muted-foreground pt-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedItem.start_time.slice(0, 5)}
                    {selectedItem.end_time && ` - ${selectedItem.end_time.slice(0, 5)}`}
                  </div>
                  {selectedItem.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {selectedItem.location}
                    </div>
                  )}
                </div>
              </DialogHeader>
              {selectedItem.description && (
                <div className="prose prose-sm max-w-none">
                  <ReactMarkdown>{selectedItem.description}</ReactMarkdown>
                </div>
              )}
            </>
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
