import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { Button } from '@/components/ui/button';
import { Calendar, Users, Building2, Map, Info } from 'lucide-react';

interface Event {
  id: string;
  name: string;
  slug: string;
  date: string | null;
  location: string | null;
  hero_image_url: string | null;
  enable_program: boolean;
  enable_participants: boolean;
  enable_exhibitors: boolean;
  enable_map: boolean;
  enable_info: boolean;
}

export default function EventHome() {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvent();
  }, [slug]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (!error && data) {
      setEvent(data);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Laster...</div>;
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Arrangement ikke funnet</h1>
          <p className="text-muted-foreground">Dette arrangementet eksisterer ikke eller er ikke publisert.</p>
        </div>
      </div>
    );
  }

  const modules = [
    { 
      name: 'Program', 
      path: `/events/${slug}/program`, 
      icon: Calendar, 
      enabled: event.enable_program,
      description: 'Se programmet for arrangementet'
    },
    { 
      name: 'Deltakere', 
      path: `/events/${slug}/participants`, 
      icon: Users, 
      enabled: event.enable_participants,
      description: 'Finn deltakere'
    },
    { 
      name: 'Utstillere', 
      path: `/events/${slug}/exhibitors`, 
      icon: Building2, 
      enabled: event.enable_exhibitors,
      description: 'Se utstillerliste'
    },
    { 
      name: 'Kart', 
      path: `/events/${slug}/map`, 
      icon: Map, 
      enabled: event.enable_map,
      description: 'Områdekart'
    },
    { 
      name: 'Praktisk info', 
      path: `/events/${slug}/info`, 
      icon: Info, 
      enabled: event.enable_info,
      description: 'Nyttig informasjon'
    },
  ].filter(m => m.enabled);

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex justify-center">
          <MEFLogo className="h-10" />
        </div>
      </header>

      {event.hero_image_url && (
        <div className="w-full aspect-[16/9] max-h-[400px] bg-muted overflow-hidden">
          <img 
            src={event.hero_image_url} 
            alt={event.name}
            className="w-full h-full object-cover object-top"
          />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{event.name}</h1>
          {(event.date || event.location) && (
            <p className="text-lg text-muted-foreground">
              {event.date && new Date(event.date).toLocaleDateString('nb-NO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
              {event.date && event.location && ' • '}
              {event.location}
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Link key={module.path} to={module.path}>
                <Button 
                  variant="outline" 
                  className="w-full h-auto py-6 flex flex-col items-center gap-3 hover:bg-accent hover:border-primary transition-all"
                >
                  <Icon className="h-8 w-8 text-primary" />
                  <div className="text-center">
                    <div className="font-semibold text-lg">{module.name}</div>
                    <div className="text-sm text-muted-foreground">{module.description}</div>
                  </div>
                </Button>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
