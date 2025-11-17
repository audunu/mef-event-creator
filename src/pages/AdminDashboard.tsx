import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Plus, Edit, Trash2, LogOut, Users } from 'lucide-react';
import { toast } from 'sonner';

interface Event {
  id: string;
  name: string;
  slug: string;
  date: string | null;
  location: string | null;
  hero_image_url: string | null;
  published: boolean;
  created_by: string | null;
  creator_name?: string;
}

export default function AdminDashboard() {
  const { user, loading, isSuperAdmin, isRegionalAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/admin/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEvents();
    }
  }, [user]);

  const fetchEvents = async () => {
    const { data: eventsData, error } = await supabase
      .from('events')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Kunne ikke laste arrangementer');
      setLoadingEvents(false);
      return;
    }

    // Fetch creator names
    const eventsWithCreators = await Promise.all(
      (eventsData || []).map(async (event) => {
        if (event.created_by) {
          const { data: profile } = await supabase
            .from('admin_profiles')
            .select('full_name')
            .eq('id', event.created_by)
            .maybeSingle();
          
          return {
            ...event,
            creator_name: profile?.full_name || 'Ukjent'
          };
        }
        return event;
      })
    );

    setEvents(eventsWithCreators);
    setLoadingEvents(false);
  };

  const handleDelete = async (id: string, name: string, createdBy: string | null) => {
    // Check permission
    if (!isSuperAdmin && createdBy !== user?.id) {
      toast.error('Du har ikke tilgang til å slette dette arrangementet');
      return;
    }

    if (!confirm(`Er du sikker på at du vil slette "${name}"?`)) return;

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Kunne ikke slette arrangement');
    } else {
      toast.success('Arrangement slettet');
      fetchEvents();
    }
  };

  const canEdit = (event: Event) => {
    return isSuperAdmin || event.created_by === user?.id;
  };

  const filteredEvents = filter === 'mine' 
    ? events.filter(event => event.created_by === user?.id)
    : events;

  const handleLogout = async () => {
    await signOut();
    navigate('/admin/login');
  };

  if (loading || !user) {
    return <div className="min-h-screen flex items-center justify-center">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-secondary/20 pb-8">
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <MEFLogo className="h-10" />
            <h1 className="text-xl font-semibold">MEF Admin</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logg ut
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Arrangementer</h2>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button variant="outline" onClick={() => navigate('/admin/users')}>
                <Users className="h-4 w-4 mr-2" />
                Brukere
              </Button>
            )}
            <Button onClick={() => navigate('/admin/events/new')}>
              <Plus className="h-4 w-4 mr-2" />
              Nytt arrangement
            </Button>
          </div>
        </div>

        {isRegionalAdmin && (
          <div className="mb-6">
            <ToggleGroup 
              type="single" 
              value={filter} 
              onValueChange={(value) => value && setFilter(value as 'all' | 'mine')}
              className="justify-start"
            >
              <ToggleGroupItem value="all" aria-label="Vis alle arrangementer">
                Alle arrangementer
              </ToggleGroupItem>
              <ToggleGroupItem value="mine" aria-label="Vis mine arrangementer">
                Mine arrangementer
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        )}

        {loadingEvents ? (
          <div className="text-center py-12">Laster arrangementer...</div>
        ) : filteredEvents.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground mb-4">Ingen arrangementer funnet</p>
              <Button onClick={() => navigate('/admin/events/new')}>
                <Plus className="h-4 w-4 mr-2" />
                Opprett ditt første arrangement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => (
              <Card key={event.id} className="overflow-hidden">
                {event.hero_image_url && (
                  <div className="aspect-video bg-muted overflow-hidden">
                    <img 
                      src={event.hero_image_url} 
                      alt={event.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{event.name}</CardTitle>
                  <CardDescription>
                    {event.date && new Date(event.date).toLocaleDateString('nb-NO', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                    {event.location && ` • ${event.location}`}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => navigate(`/admin/events/${event.id}`)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Rediger
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDelete(event.id, event.name, event.created_by)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
