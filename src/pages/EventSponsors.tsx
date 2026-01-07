import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface Sponsor {
  id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  display_order: number;
}

interface Event {
  id: string;
  name: string;
  slug: string;
  sponsors_module_title: string | null;
  enable_program: boolean;
  enable_participants: boolean;
  enable_exhibitors: boolean;
  enable_map: boolean;
  enable_info: boolean;
  sponsors_module_enabled: boolean;
}

export default function EventSponsors() {
  const { slug } = useParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [slug]);

  const fetchData = async () => {
    // Fetch event
    const { data: eventData, error: eventError } = await supabase
      .from('events')
      .select('id, name, slug, sponsors_module_title, enable_program, enable_participants, enable_exhibitors, enable_map, enable_info, sponsors_module_enabled')
      .eq('slug', slug)
      .eq('published', true)
      .single();

    if (eventError || !eventData) {
      setLoading(false);
      return;
    }

    setEvent(eventData);

    // Fetch sponsors
    const { data: sponsorsData } = await supabase
      .from('event_sponsors')
      .select('*')
      .eq('event_id', eventData.id)
      .order('display_order', { ascending: true });

    setSponsors(sponsorsData || []);
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

  const moduleTitle = event.sponsors_module_title || 'Leverandører';

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to={`/events/${slug}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <MEFLogo className="h-8" />
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">{moduleTitle}</h1>

        {sponsors.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">
            Ingen leverandører er lagt til ennå.
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {sponsors.map((sponsor) => {
              const content = (
                <div className="bg-card rounded-xl p-4 md:p-6 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 flex items-center justify-center h-28 md:h-32">
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.name}
                    loading="lazy"
                    className="max-h-20 md:max-h-24 w-auto object-contain"
                  />
                </div>
              );

              if (sponsor.website_url) {
                return (
                  <a
                    key={sponsor.id}
                    href={sponsor.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block"
                    aria-label={`Besøk ${sponsor.name} sin nettside`}
                  >
                    {content}
                  </a>
                );
              }

              return (
                <div key={sponsor.id} aria-label={sponsor.name}>
                  {content}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNav
        eventSlug={slug!}
        modules={{
          program: event.enable_program,
          participants: event.enable_participants,
          exhibitors: event.enable_exhibitors,
          map: event.enable_map,
          info: event.enable_info,
          sponsors: event.sponsors_module_enabled,
          sponsorsTitle: moduleTitle,
        }}
      />
    </div>
  );
}