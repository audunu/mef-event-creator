import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { MEFLogo } from '@/components/MEFLogo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2, CheckCircle2, XCircle, HelpCircle, Download } from 'lucide-react';
import { toast } from 'sonner';
import { InfoSectionManager } from '@/components/InfoSectionManager';
import { MapUploader } from '@/components/MapUploader';
import { HeroImageUploader } from '@/components/HeroImageUploader';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import QRCode from 'qrcode';

interface EventData {
  name: string;
  slug: string;
  date: string;
  location: string;
  hero_image_url: string;
  published: boolean;
  enable_program: boolean;
  enable_participants: boolean;
  enable_exhibitors: boolean;
  enable_map: boolean;
  enable_info: boolean;
  google_sheets_url: string;
  last_synced_at: string | null;
}

export default function EventEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [formData, setFormData] = useState<EventData>({
    name: '',
    slug: '',
    date: '',
    location: '',
    hero_image_url: '',
    published: false,
    enable_program: true,
    enable_participants: true,
    enable_exhibitors: true,
    enable_map: false,
    enable_info: true,
    google_sheets_url: '',
    last_synced_at: null,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/admin/login');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (id && id !== 'new') {
      fetchEvent();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const generateQR = async () => {
      if (formData.slug) {
        const publicUrl = `${window.location.origin}/events/${formData.slug}`;
        try {
          const dataUrl = await QRCode.toDataURL(publicUrl, {
            width: 256,
            margin: 2,
            color: {
              dark: '#000000',
              light: '#FFFFFF',
            },
          });
          setQrCodeUrl(dataUrl);
        } catch (err) {
          console.error('Error generating QR code:', err);
        }
      }
    };
    generateQR();
  }, [formData.slug]);

  const fetchEvent = async () => {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Kunne ikke laste arrangement');
      navigate('/admin/dashboard');
    } else {
      setFormData({
        name: data.name,
        slug: data.slug,
        date: data.date || '',
        location: data.location || '',
        hero_image_url: data.hero_image_url || '',
        published: data.published,
        enable_program: data.enable_program,
        enable_participants: data.enable_participants,
        enable_exhibitors: data.enable_exhibitors,
        enable_map: data.enable_map,
        enable_info: data.enable_info,
        google_sheets_url: data.google_sheets_url || '',
        last_synced_at: data.last_synced_at,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.slug) {
      toast.error('Navn og URL-slug er påkrevd');
      return;
    }

    setSaving(true);

    const eventData = {
      name: formData.name,
      slug: formData.slug.toLowerCase().replace(/\s+/g, '-'),
      date: formData.date || null,
      location: formData.location || null,
      hero_image_url: formData.hero_image_url || null,
      published: formData.published,
      enable_program: formData.enable_program,
      enable_participants: formData.enable_participants,
      enable_exhibitors: formData.enable_exhibitors,
      enable_map: formData.enable_map,
      enable_info: formData.enable_info,
      google_sheets_url: formData.google_sheets_url || null,
    };

    let result;
    if (id === 'new') {
      result = await supabase.from('events').insert(eventData).select().single();
    } else {
      result = await supabase.from('events').update(eventData).eq('id', id).select().single();
    }

    const { error } = result;

    if (error) {
      toast.error('Kunne ikke lagre arrangement');
    } else {
      toast.success('Arrangement lagret');
      if (id === 'new') {
        navigate(`/admin/events/${result.data.id}`);
      }
    }

    setSaving(false);
  };

  const handleSync = async () => {
    if (!formData.google_sheets_url) {
      toast.error('Google Sheets URL er påkrevd');
      return;
    }

    setSyncing(true);
    setSyncResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('sync-sheets', {
        body: {
          sheetsUrl: formData.google_sheets_url,
          eventId: id,
        },
      });

      if (error) throw error;

      setSyncResult(data);
      
      // Update last synced timestamp
      await supabase
        .from('events')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', id);

      toast.success('Synkronisering fullført');
    } catch (error: any) {
      toast.error('Synkronisering feilet: ' + error.message);
      setSyncResult({ success: false, error: error.message });
    }

    setSyncing(false);
  };

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${formData.slug}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR-kode lastet ned');
  };

  if (authLoading || loading) {
    return <div className="min-h-screen flex items-center justify-center">Laster...</div>;
  }

  return (
    <div className="min-h-screen bg-secondary/20 pb-8">
      <header className="bg-card border-b border-border sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <MEFLogo className="h-8" />
          <h1 className="text-lg font-semibold">
            {id === 'new' ? 'Nytt arrangement' : 'Rediger arrangement'}
          </h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Grunninfo */}
        <Card>
          <CardHeader>
            <CardTitle>Grunninfo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Navn *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Loendagene 2026"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL-slug *</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                placeholder="loendagene-2026"
              />
              <p className="text-sm text-muted-foreground">
                Bruk kun små bokstaver og bindestrek. Eksempel: loendagene-2026
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="date">Dato</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Sted</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Oslo"
                />
              </div>
            </div>
            {id && id !== 'new' ? (
              <div className="space-y-2">
                <Label>Hovedbilde</Label>
                <HeroImageUploader
                  eventId={id}
                  currentImageUrl={formData.hero_image_url}
                  onImageUpdate={(newUrl) => setFormData({ ...formData, hero_image_url: newUrl })}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Lagre arrangementet først for å kunne laste opp hovedbilde
              </p>
            )}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => setFormData({ ...formData, published: checked as boolean })}
              />
              <Label htmlFor="published" className="font-normal cursor-pointer">
                Publiser arrangement (gjør det synlig for alle)
              </Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="public_url">Offentlig URL</Label>
              <div className="flex gap-2">
                <Input
                  id="public_url"
                  value={`${window.location.origin}/events/${formData.slug}`}
                  readOnly
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/events/${formData.slug}`);
                    toast.success('URL kopiert!');
                  }}
                >
                  Kopier
                </Button>
              </div>
            </div>
            {formData.slug && qrCodeUrl && (
              <div className="space-y-2">
                <Label>QR-kode for arrangement</Label>
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  <div className="flex-shrink-0">
                    <img 
                      src={qrCodeUrl} 
                      alt="QR Code" 
                      className="w-48 h-48 border border-border rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <p className="text-sm text-muted-foreground">
                      Skann QR-koden for å gå direkte til arrangementssiden
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDownloadQR}
                      className="w-fit"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Last ned QR-kode
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moduler */}
        <Card>
          <CardHeader>
            <CardTitle>Moduler</CardTitle>
            <CardDescription>Velg hvilke moduler som skal være aktive</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable_program"
                checked={formData.enable_program}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_program: checked as boolean })}
              />
              <Label htmlFor="enable_program" className="font-normal cursor-pointer">Program</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable_participants"
                checked={formData.enable_participants}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_participants: checked as boolean })}
              />
              <Label htmlFor="enable_participants" className="font-normal cursor-pointer">Deltakere</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable_exhibitors"
                checked={formData.enable_exhibitors}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_exhibitors: checked as boolean })}
              />
              <Label htmlFor="enable_exhibitors" className="font-normal cursor-pointer">Utstillere</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable_map"
                checked={formData.enable_map}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_map: checked as boolean })}
              />
              <Label htmlFor="enable_map" className="font-normal cursor-pointer">Kart</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="enable_info"
                checked={formData.enable_info}
                onCheckedChange={(checked) => setFormData({ ...formData, enable_info: checked as boolean })}
              />
              <Label htmlFor="enable_info" className="font-normal cursor-pointer">Praktisk info</Label>
            </div>
          </CardContent>
        </Card>

        {/* Google Sheets Sync */}
        {(formData.enable_program || formData.enable_participants || formData.enable_exhibitors) && id !== 'new' && (
          <Card>
            <CardHeader>
              <CardTitle>Google Sheets Synkronisering</CardTitle>
              <CardDescription>
                Importer data fra Google Sheets til Program, Deltakere og Utstillere
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="sheets_url">Google Sheets URL</Label>
                  <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
                    <CollapsibleTrigger asChild>
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        aria-label="Hjelp"
                      >
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </CollapsibleTrigger>
                  </Collapsible>
                </div>
                <Input
                  id="sheets_url"
                  value={formData.google_sheets_url}
                  onChange={(e) => setFormData({ ...formData, google_sheets_url: e.target.value })}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                />
                <Collapsible open={helpOpen} onOpenChange={setHelpOpen}>
                  <CollapsibleContent className="mt-3">
                    <div className="rounded-lg border bg-card p-4 space-y-4 text-sm">
                      <h3 className="font-semibold text-base">Hvordan sette opp Google Sheets</h3>
                      
                      <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border-l-4 border-amber-500 p-3">
                        <p className="font-semibold flex items-start gap-2">
                          <span className="text-amber-600">⚠️</span>
                          <span>VIKTIG:</span>
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Du må være pålogget <strong>mef.arrangementer@gmail.com</strong> for å få tilgang til malen. 
                          Kontakt Audun for å få passord til denne kontoen.
                        </p>
                        <p className="mt-2 text-muted-foreground text-xs">
                          Sørg for at du er pålogget riktig Google-konto før du starter. 
                          Hvis du har flere Google-kontoer, kan du sjekke hvilken konto du er pålogget på 
                          ved å se på profilikonet øverst til høyre i Google. 
                          Hvis du er pålogget feil konto, logg ut og logg inn på mef.arrangementer@gmail.com først.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <p className="font-medium">Steg:</p>
                        <ol className="space-y-2 list-decimal list-inside text-muted-foreground">
                          <li>Logg inn på mef.arrangementer@gmail.com</li>
                          <li>Gå til Google Drive: <a href="https://drive.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:no-underline">https://drive.google.com</a></li>
                          <li>Finn malen "MEF mal (lag en kopi av denne for å opprette ny arrangementsdatabase)"</li>
                          <li>Høyreklikk på malen og velg "Lag en kopi"</li>
                          <li>Gi kopien et beskrivende navn (f.eks. "Loendagene 2026 Data")</li>
                          <li>Høyreklikk på kopien i Google Drive og velg "Del"</li>
                          <li>Under "Generell tilgang", velg "Alle med linken" og sett til "Leser"</li>
                          <li>Klikk "Ferdig"</li>
                          <li>Åpne kopien</li>
                          <li>Kopier lenken fra adressefeltet i nettleseren</li>
                          <li>Lim inn lenken i feltet over</li>
                          <li>Klikk "Synkroniser alle moduler"</li>
                        </ol>
                      </div>

                      <p className="text-muted-foreground">
                        Nå kan du begynne å fylle inn data i arkene "Program", "Deltakere" og "Utstillere" i Google Sheets. 
                        Dataene vil automatisk vises i appen når du synkroniserer.
                      </p>

                      <div className="rounded-md bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-3">
                        <p className="font-medium text-blue-900 dark:text-blue-100">💡 Tips:</p>
                        <p className="mt-1 text-blue-800 dark:text-blue-200 text-xs">
                          Hvis synkroniseringen ikke fungerer, sjekk at:
                        </p>
                        <ol className="mt-1 ml-4 space-y-1 list-decimal text-blue-800 dark:text-blue-200 text-xs">
                          <li>Du er pålogget riktig Google-konto (mef.arrangementer@gmail.com)</li>
                          <li>Delingstillatelsene er satt til minst "Alle med linken kan se" (høyreklikk på filen i Drive og velg "Del")</li>
                        </ol>
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
              <Button onClick={handleSync} disabled={syncing || !formData.google_sheets_url}>
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Synkroniser alle moduler
              </Button>
              
              {formData.last_synced_at && (
                <p className="text-sm text-muted-foreground">
                  Sist synkronisert: {new Date(formData.last_synced_at).toLocaleString('nb-NO')}
                </p>
              )}

              {syncResult && (
                <div className="mt-4 space-y-2">
                  <Separator />
                  <h4 className="font-semibold">Synkroniseringsresultat:</h4>
                  {syncResult.success ? (
                    <div className="space-y-1">
                      {syncResult.results?.program && (
                        <div className="flex items-center gap-2 text-sm">
                          {syncResult.results.program.errors?.length > 0 ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          <span>Program: {syncResult.results.program.count} poster</span>
                        </div>
                      )}
                      {syncResult.results?.participants && (
                        <div className="flex items-center gap-2 text-sm">
                          {syncResult.results.participants.errors?.length > 0 ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          <span>Deltakere: {syncResult.results.participants.count} poster</span>
                        </div>
                      )}
                      {syncResult.results?.exhibitors && (
                        <div className="flex items-center gap-2 text-sm">
                          {syncResult.results.exhibitors.errors?.length > 0 ? (
                            <XCircle className="h-4 w-4 text-destructive" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          )}
                          <span>Utstillere: {syncResult.results.exhibitors.count} poster</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-destructive">{syncResult.error}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Praktisk Info Management */}
        {formData.enable_info && id !== 'new' && (
          <InfoSectionManager eventId={id} />
        )}

        {/* Kart Upload */}
        {formData.enable_map && id !== 'new' && (
          <MapUploader eventId={id} />
        )}

        {/* Save buttons */}
        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={saving} size="lg">
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Lagre endringer
          </Button>
          {id !== 'new' && formData.published && (
            <Button
              variant="outline"
              size="lg"
              onClick={() => window.open(`/events/${formData.slug}`, '_blank')}
            >
              Forhåndsvis
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
