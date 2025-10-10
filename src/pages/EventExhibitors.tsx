import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search } from 'lucide-react';

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

interface Exhibitor {
  id: string;
  company_name: string;
  stand_number: string | null;
}

export default function EventExhibitors() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [exhibitors, setExhibitors] = useState<Exhibitor[]>([]);
  const [filteredExhibitors, setFilteredExhibitors] = useState<Exhibitor[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [slug]);

  useEffect(() => {
    if (search) {
      const filtered = exhibitors.filter(e =>
        e.company_name.toLowerCase().includes(search.toLowerCase()) ||
        e.stand_number?.toLowerCase().includes(search.toLowerCase())
      );
      setFilteredExhibitors(filtered);
    } else {
      setFilteredExhibitors(exhibitors);
    }
  }, [search, exhibitors]);

  const fetchData = async () => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (eventData) {
      setEvent(eventData);
      
      const { data: exhibitorData } = await supabase
        .from('exhibitors')
        .select('*')
        .eq('event_id', eventData.id)
        .order('company_name', { ascending: true });

      setExhibitors(exhibitorData || []);
      setFilteredExhibitors(exhibitorData || []);
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
          <h1 className="text-lg font-semibold">Utstillere</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Søk etter bedrift..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {filteredExhibitors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? 'Ingen treff' : 'Ingen utstillere ennå'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredExhibitors.map((exhibitor) => (
              <Card key={exhibitor.id}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="font-semibold">{exhibitor.company_name}</div>
                  {exhibitor.stand_number && (
                    <Badge variant="secondary">Stand: {exhibitor.stand_number}</Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground text-center">
          Viser {filteredExhibitors.length} av {exhibitors.length} utstillere
        </div>
      </div>

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
