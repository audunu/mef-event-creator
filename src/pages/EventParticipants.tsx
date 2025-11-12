import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
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

interface Participant {
  id: string;
  name: string;
  company: string | null;
}

interface GroupedParticipants {
  company: string;
  participants: Participant[];
}

type SortMode = 'name' | 'company';

export default function EventParticipants() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [groupedParticipants, setGroupedParticipants] = useState<GroupedParticipants[]>([]);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const saved = localStorage.getItem('participantsSortMode');
    return (saved as SortMode) || 'company';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [slug]);

  useEffect(() => {
    localStorage.setItem('participantsSortMode', sortMode);
  }, [sortMode]);

  useEffect(() => {
    const norwegianSort = (a: string, b: string) => {
      return a.localeCompare(b, 'no', { sensitivity: 'base' });
    };

    let filtered = participants;
    
    if (search) {
      filtered = participants.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.company?.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (sortMode === 'name') {
      // Sort by person name
      const sorted = [...filtered].sort((a, b) => norwegianSort(a.name, b.name));
      setFilteredParticipants(sorted);
      setGroupedParticipants([]);
    } else {
      // Group by company
      const groups = filtered.reduce((acc, participant) => {
        const company = participant.company || 'Ingen bedrift';
        if (!acc[company]) {
          acc[company] = [];
        }
        acc[company].push(participant);
        return acc;
      }, {} as Record<string, Participant[]>);

      // Sort companies alphabetically, then people within each company
      const sorted = Object.entries(groups)
        .sort(([a], [b]) => norwegianSort(a, b))
        .map(([company, participants]) => ({
          company,
          participants: participants.sort((a, b) => norwegianSort(a.name, b.name))
        }));

      setGroupedParticipants(sorted);
      setFilteredParticipants([]);
    }
  }, [search, participants, sortMode]);

  const fetchData = async () => {
    const { data: eventData } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (eventData) {
      setEvent(eventData);
      
      const { data: participantData } = await supabase
        .from('participants')
        .select('*')
        .eq('event_id', eventData.id)
        .order('name', { ascending: true });

      setParticipants(participantData || []);
      setFilteredParticipants(participantData || []);
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
          <h1 className="text-lg font-semibold">Deltakere</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Søk etter navn eller bedrift..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          <ToggleGroup type="single" value={sortMode} onValueChange={(value) => value && setSortMode(value as SortMode)} className="justify-start">
            <ToggleGroupItem value="company" className="flex-1 sm:flex-initial">
              Sorter på bedrift
            </ToggleGroupItem>
            <ToggleGroupItem value="name" className="flex-1 sm:flex-initial">
              Sorter på navn
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {(sortMode === 'name' ? filteredParticipants.length === 0 : groupedParticipants.length === 0) ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? 'Ingen treff' : 'Ingen deltakere ennå'}
            </CardContent>
          </Card>
        ) : sortMode === 'name' ? (
          <div className="space-y-2">
            {filteredParticipants.map((participant) => (
              <Card key={participant.id}>
                <CardContent className="py-4">
                  <div className="font-semibold">{participant.name}</div>
                  {participant.company && (
                    <div className="text-sm text-muted-foreground">{participant.company}</div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {groupedParticipants.map((group) => (
              <Card key={group.company}>
                <CardContent className="py-4">
                  <div className="font-bold text-base mb-2">{group.company}</div>
                  <div className="space-y-1">
                    {group.participants.map((participant) => (
                      <div key={participant.id} className="text-sm text-muted-foreground pl-2">
                        {participant.name}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground text-center">
          Viser {sortMode === 'name' ? filteredParticipants.length : groupedParticipants.reduce((sum, g) => sum + g.participants.length, 0)} av {participants.length} deltakere
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
