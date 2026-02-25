import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { BottomNav } from '@/components/BottomNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Clock, MapPin, ExternalLink } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

function convertGoogleDriveUrl(url: string | null): string | null {
  if (!url) return null;
  // Extract file ID from various Google Drive URL formats
  let fileId: string | null = null;
  // /file/d/FILE_ID/...
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) fileId = fileMatch[1];
  // /open?id=FILE_ID
  if (!fileId) {
    const openMatch = url.match(/drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/);
    if (openMatch) fileId = openMatch[1];
  }
  // uc?export=view&id=FILE_ID
  if (!fileId) {
    const ucMatch = url.match(/drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/);
    if (ucMatch) fileId = ucMatch[1];
  }
  // Use lh3.googleusercontent.com which works cross-origin
  if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}`;
  return url;
}

function ImageWithFallback({ src, alt, className, style }: { src: string; alt: string; className?: string; style?: React.CSSProperties }) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return <img src={src} alt={alt} className={className} style={style} loading="lazy" onError={() => setFailed(true)} />;
}

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
  location_url: string | null;
  category: string | null;
  image_url: string | null;
  image_url_2: string | null;
}

export default function EventProgram() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [event, setEvent] = useState<Event | null>(null);
  const [items, setItems] = useState<ProgramItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<ProgramItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [slug]);

  useEffect(() => {
    const dayParam = searchParams.get('day');
    const categoryParam = searchParams.get('category');
    setSelectedDay(dayParam);
    setSelectedCategory(categoryParam);
  }, [searchParams]);

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

  const uniqueDays = Object.keys(groupedByDay).sort();
  const showDayFilters = uniqueDays.length > 1;

  // Extract and process categories
  const extractCategories = (items: ProgramItem[]): string[] => {
    const categoriesSet = new Set<string>();
    items.forEach(item => {
      if (item.category) {
        // Split by comma, trim whitespace, filter empty strings
        const categories = item.category
          .split(',')
          .map(cat => cat.trim())
          .filter(cat => cat.length > 0);
        categories.forEach(cat => categoriesSet.add(cat.toLowerCase()));
      }
    });
    // Sort alphabetically (A-Å Norwegian order)
    return Array.from(categoriesSet).sort((a, b) => a.localeCompare(b, 'no'));
  };

  const uniqueCategories = extractCategories(items);
  const showCategoryFilters = uniqueCategories.length > 0;

  // Filter by category
  const categoryFilteredItems = selectedCategory
    ? items.filter(item => {
        if (!item.category) return false;
        const itemCategories = item.category
          .split(',')
          .map(cat => cat.trim().toLowerCase());
        return itemCategories.includes(selectedCategory.toLowerCase());
      })
    : items;

  // Group filtered items by day
  const filteredGroupedByDay = categoryFilteredItems.reduce((acc, item) => {
    const day = item.day;
    if (!acc[day]) acc[day] = [];
    acc[day].push(item);
    return acc;
  }, {} as Record<string, ProgramItem[]>);

  // Then filter by selected day
  const finalFilteredGroupedByDay = selectedDay
    ? { [selectedDay]: filteredGroupedByDay[selectedDay] || [] }
    : filteredGroupedByDay;

  const handleDayFilter = (day: string | null) => {
    setSelectedDay(day);
    const params: Record<string, string> = {};
    if (day) params.day = day;
    if (selectedCategory) params.category = selectedCategory;
    setSearchParams(params);
  };

  const handleCategoryFilter = (category: string | null) => {
    setSelectedCategory(category);
    const params: Record<string, string> = {};
    if (selectedDay) params.day = selectedDay;
    if (category) params.category = category;
    setSearchParams(params);
  };

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
        {showDayFilters && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedDay ? 'default' : 'outline'}
                onClick={() => handleDayFilter(null)}
              >
                Alle dager
              </Button>
              {uniqueDays.map((day) => {
                const date = new Date(day + 'T00:00:00');
                const dayName = date.toLocaleDateString('no-NO', { weekday: 'long' });
                const capitalized = dayName.charAt(0).toUpperCase() + dayName.slice(1);
                
                return (
                  <Button
                    key={day}
                    variant={selectedDay === day ? 'default' : 'outline'}
                    onClick={() => handleDayFilter(day)}
                  >
                    {capitalized}
                  </Button>
                );
              })}
            </div>
          </div>
        )}

        {showCategoryFilters && (
          <div className="mb-6">
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!selectedCategory ? 'default' : 'outline'}
                onClick={() => handleCategoryFilter(null)}
              >
                Alle kategorier
              </Button>
              {uniqueCategories.map((category) => {
                // Find first occurrence to get original casing
                const originalCase = items.find(item => 
                  item.category?.toLowerCase().includes(category.toLowerCase())
                )?.category?.split(',')
                  .map(c => c.trim())
                  .find(c => c.toLowerCase() === category.toLowerCase()) || category;
                
                return (
                  <Button
                    key={category}
                    variant={selectedCategory?.toLowerCase() === category.toLowerCase() ? 'default' : 'outline'}
                    onClick={() => handleCategoryFilter(category)}
                  >
                    {originalCase}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        
        {Object.keys(finalFilteredGroupedByDay).length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Ingen programposter {selectedDay && 'denne dagen'}{selectedCategory && selectedDay && ' og '}{selectedCategory && 'i denne kategorien'}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(finalFilteredGroupedByDay).map(([day, dayItems]) => (
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
                  {dayItems.map((item) => {
                    const img1 = convertGoogleDriveUrl(item.image_url);
                    const img2 = convertGoogleDriveUrl(item.image_url_2);
                    return (
                    <Card 
                      key={item.id} 
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-1 text-sm text-muted-foreground" style={{ minWidth: '82px', flexShrink: 0 }}>
                            <Clock className="h-4 w-4" />
                            {item.start_time.slice(0, 5)}
                            {item.end_time && ` - ${item.end_time.slice(0, 5)}`}
                          </div>
                          <div className="flex-1 min-w-0 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-base">{item.title}</CardTitle>
                              {item.location && (
                                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.location_url ? (
                                    <a 
                                      href={item.location_url} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline inline-flex items-center gap-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {item.location}
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  ) : (
                                    item.location
                                  )}
                                </div>
                              )}
                            </div>
                            {img1 && img2 ? (
                              <div className="flex gap-1" style={{ flexShrink: 0 }}>
                                <ImageWithFallback src={img1} alt="" className="rounded-lg object-cover" style={{ width: 44, height: 44, border: '1px solid #e5e7eb' }} />
                                <ImageWithFallback src={img2} alt="" className="rounded-lg object-cover" style={{ width: 44, height: 44, border: '1px solid #e5e7eb' }} />
                              </div>
                            ) : img1 ? (
                              <ImageWithFallback src={img1} alt="" className="rounded-lg object-cover" style={{ width: 52, height: 52, flexShrink: 0, border: '1px solid #e5e7eb' }} />
                            ) : null}
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedItem && (() => {
              const modalImg1 = convertGoogleDriveUrl(selectedItem.image_url);
              const modalImg2 = convertGoogleDriveUrl(selectedItem.image_url_2);
              return (
              <>
                {(modalImg1 || modalImg2) && (
                  <div className={cn("flex gap-2 mb-2", modalImg1 && modalImg2 ? "" : "")}>
                    {modalImg1 && (
                      <ImageWithFallback src={modalImg1} alt="" className={cn("rounded-lg object-cover", modalImg2 ? "w-1/2" : "w-full")} style={{ maxHeight: 200 }} />
                    )}
                    {modalImg2 && (
                      <ImageWithFallback src={modalImg2} alt="" className={cn("rounded-lg object-cover", modalImg1 ? "w-1/2" : "w-full")} style={{ maxHeight: 200 }} />
                    )}
                  </div>
                )}
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
                        {selectedItem.location_url ? (
                          <a 
                            href={selectedItem.location_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1"
                          >
                            {selectedItem.location}
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        ) : (
                          selectedItem.location
                        )}
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
              );
            })()}
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
