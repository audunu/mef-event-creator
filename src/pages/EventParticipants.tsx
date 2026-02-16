import { useEffect, useState, useMemo } from 'react';
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
  category: string | null;
}

interface GroupedParticipants {
  company: string;
  participants: Participant[];
}

type SortMode = 'name' | 'company';

const norwegianSort = (a: string, b: string) =>
  a.localeCompare(b, 'no', { sensitivity: 'base' });

function parseCategories(category: string | null): string[] {
  if (!category) return [];
  return category.split(',').map(c => c.trim()).filter(c => c.length > 0);
}

export default function EventParticipants() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [search, setSearch] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const saved = localStorage.getItem('participantsSortMode');
    return (saved as SortMode) || 'company';
  });
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [slug]);

  useEffect(() => {
    localStorage.setItem('participantsSortMode', sortMode);
  }, [sortMode]);

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
    }
    setLoading(false);
  };

  // Check if any participant has category data
  const hasCategories = useMemo(
    () => participants.some(p => p.category && p.category.trim().length > 0),
    [participants]
  );

  // Extract unique categories
  const uniqueCategories = useMemo(() => {
    const catSet = new Set<string>();
    let hasEmpty = false;
    participants.forEach(p => {
      const cats = parseCategories(p.category);
      if (cats.length === 0 && hasCategories) hasEmpty = true;
      cats.forEach(c => catSet.add(c));
    });
    const sorted = Array.from(catSet).sort((a, b) => norwegianSort(a, b));
    if (hasEmpty) sorted.push('Ingen kategori');
    return sorted;
  }, [participants, hasCategories]);

  // Filtered results
  const displayData = useMemo(() => {
    // 1. Filter by category
    let filtered = participants;
    if (selectedCategory) {
      if (selectedCategory === 'Ingen kategori') {
        filtered = participants.filter(p => !p.category || p.category.trim().length === 0);
      } else {
        filtered = participants.filter(p => {
          const cats = parseCategories(p.category);
          return cats.some(c => c.toLowerCase() === selectedCategory.toLowerCase());
        });
      }
    }

    // 2. Filter by search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
      );
    }

    // 3. Sort/group
    if (sortMode === 'name') {
      return {
        mode: 'name' as const,
        items: [...filtered].sort((a, b) => norwegianSort(a.name, b.name)),
        total: filtered.length,
      };
    } else {
      const groups: Record<string, Participant[]> = {};
      filtered.forEach(p => {
        const company = p.company || 'Ingen bedrift';
        if (!groups[company]) groups[company] = [];
        groups[company].push(p);
      });
      const sorted = Object.entries(groups)
        .sort(([a], [b]) => norwegianSort(a, b))
        .map(([company, parts]) => ({
          company,
          participants: parts.sort((a, b) => norwegianSort(a.name, b.name)),
        }));
      return {
        mode: 'company' as const,
        groups: sorted,
        total: sorted.reduce((sum, g) => sum + g.participants.length, 0),
      };
    }
  }, [participants, selectedCategory, search, sortMode]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laster...</div>;
  }

  if (!event) {
    return <div className="min-h-screen flex items-center justify-center">Arrangement ikke funnet</div>;
  }

  const totalShown = displayData.mode === 'name' ? displayData.items.length : displayData.total;

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
              placeholder={hasCategories ? "Søk etter navn, bedrift eller kategori..." : "Søk etter navn eller bedrift..."}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {hasCategories && uniqueCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                onClick={() => setSelectedCategory(null)}
              >
                Alle
              </Button>
              {uniqueCategories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          )}

          <ToggleGroup type="single" value={sortMode} onValueChange={(value) => value && setSortMode(value as SortMode)} className="justify-start">
            <ToggleGroupItem value="company" className="flex-1 sm:flex-initial">
              Sorter på bedrift
            </ToggleGroupItem>
            <ToggleGroupItem value="name" className="flex-1 sm:flex-initial">
              Sorter på navn
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        {totalShown === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {search ? 'Ingen treff' : 'Ingen deltakere ennå'}
            </CardContent>
          </Card>
        ) : displayData.mode === 'name' ? (
          <div className="space-y-2">
            {displayData.items.map(participant => (
              <ParticipantCard key={participant.id} participant={participant} showCategory={hasCategories} />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {displayData.groups.map(group => (
              <Card key={group.company}>
                <CardContent className="py-4">
                  <div className="font-bold text-base mb-2">{group.company}</div>
                  <div className="space-y-1">
                    {group.participants.map(participant => (
                      <div key={participant.id} className="pl-2">
                        <div className="text-sm text-muted-foreground">{participant.name}</div>
                        {hasCategories && participant.category && (
                          <div className="text-xs text-muted-foreground/70 pl-0">{participant.category}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-4 text-sm text-muted-foreground text-center">
          Viser {totalShown} av {participants.length} deltakere
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

function ParticipantCard({ participant, showCategory }: { participant: Participant; showCategory: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="font-semibold">{participant.name}</div>
        {participant.company && (
          <div className="text-sm text-muted-foreground">{participant.company}</div>
        )}
        {showCategory && participant.category && (
          <div className="text-xs text-muted-foreground/70">{participant.category}</div>
        )}
      </CardContent>
    </Card>
  );
}
