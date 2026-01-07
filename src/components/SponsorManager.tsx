import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, GripVertical, Loader2, Upload, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface Sponsor {
  id: string;
  event_id: string;
  name: string;
  logo_url: string;
  website_url: string | null;
  display_order: number;
}

interface SponsorManagerProps {
  eventId: string;
}

export function SponsorManager({ eventId }: SponsorManagerProps) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Dialog states
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSponsor, setSelectedSponsor] = useState<Sponsor | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchSponsors();
  }, [eventId]);

  const fetchSponsors = async () => {
    try {
      const { data, error } = await supabase
        .from('event_sponsors')
        .select('*')
        .eq('event_id', eventId)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error('Error fetching sponsors:', error);
      toast.error('Kunne ikke laste leverandører');
    } finally {
      setLoading(false);
    }
  };

  const validateFile = (file: File): string | null => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2 MB

    if (!allowedTypes.includes(file.type)) {
      return 'Ugyldig filformat. Bruk PNG, JPG, SVG eller WebP.';
    }
    if (file.size > maxSize) {
      return 'Filen er for stor. Maks størrelse er 2 MB.';
    }
    return null;
  };

  const handleUpload = async () => {
    if (!formName.trim()) {
      toast.error('Bedriftsnavn er påkrevd');
      return;
    }
    if (!formFile) {
      toast.error('Logo er påkrevd');
      return;
    }

    const validationError = validateFile(formFile);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = formFile.name.split('.').pop();
      const fileName = `events/${eventId}/${crypto.randomUUID()}-${formFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('sponsor-logos')
        .upload(fileName, formFile);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('sponsor-logos')
        .getPublicUrl(fileName);

      // Create database record
      const maxOrder = sponsors.length > 0 
        ? Math.max(...sponsors.map(s => s.display_order)) + 1 
        : 0;

      const { error: dbError } = await supabase
        .from('event_sponsors')
        .insert({
          event_id: eventId,
          name: formName.trim(),
          logo_url: publicUrl,
          website_url: formWebsite.trim() || null,
          display_order: maxOrder,
        });

      if (dbError) throw dbError;

      toast.success('Leverandør lagt til');
      resetForm();
      setUploadDialogOpen(false);
      fetchSponsors();
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Opplasting feilet. Prøv igjen.');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedSponsor || !formName.trim()) {
      toast.error('Bedriftsnavn er påkrevd');
      return;
    }

    setSaving(true);

    try {
      let logoUrl = selectedSponsor.logo_url;

      // If new file uploaded, upload it
      if (formFile) {
        const validationError = validateFile(formFile);
        if (validationError) {
          toast.error(validationError);
          setSaving(false);
          return;
        }

        const fileName = `events/${eventId}/${crypto.randomUUID()}-${formFile.name}`;
        
        const { error: uploadError } = await supabase.storage
          .from('sponsor-logos')
          .upload(fileName, formFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('sponsor-logos')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;

        // Optionally delete old file (extract path from old URL)
        try {
          const oldPath = selectedSponsor.logo_url.split('/sponsor-logos/')[1];
          if (oldPath) {
            await supabase.storage.from('sponsor-logos').remove([oldPath]);
          }
        } catch (e) {
          // Ignore deletion errors
        }
      }

      const { error: dbError } = await supabase
        .from('event_sponsors')
        .update({
          name: formName.trim(),
          website_url: formWebsite.trim() || null,
          logo_url: logoUrl,
        })
        .eq('id', selectedSponsor.id);

      if (dbError) throw dbError;

      toast.success('Leverandør oppdatert');
      resetForm();
      setEditDialogOpen(false);
      setSelectedSponsor(null);
      fetchSponsors();
    } catch (error) {
      console.error('Update error:', error);
      toast.error('Oppdatering feilet. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedSponsor) return;

    try {
      // Delete from database
      const { error: dbError } = await supabase
        .from('event_sponsors')
        .delete()
        .eq('id', selectedSponsor.id);

      if (dbError) throw dbError;

      // Try to delete from storage
      try {
        const path = selectedSponsor.logo_url.split('/sponsor-logos/')[1];
        if (path) {
          await supabase.storage.from('sponsor-logos').remove([path]);
        }
      } catch (e) {
        // Ignore storage deletion errors
      }

      toast.success('Leverandør slettet');
      setDeleteDialogOpen(false);
      setSelectedSponsor(null);
      fetchSponsors();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Sletting feilet. Prøv igjen.');
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newSponsors = [...sponsors];
    const draggedItem = newSponsors[draggedIndex];
    newSponsors.splice(draggedIndex, 1);
    newSponsors.splice(index, 0, draggedItem);
    
    setSponsors(newSponsors);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    // Update display_order for all sponsors
    try {
      const updates = sponsors.map((sponsor, index) => ({
        id: sponsor.id,
        display_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from('event_sponsors')
          .update({ display_order: update.display_order })
          .eq('id', update.id);
      }
    } catch (error) {
      console.error('Reorder error:', error);
      toast.error('Kunne ikke lagre ny rekkefølge');
      fetchSponsors(); // Refresh to original order
    }

    setDraggedIndex(null);
  };

  const resetForm = () => {
    setFormName('');
    setFormWebsite('');
    setFormFile(null);
  };

  const openEditDialog = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setFormName(sponsor.name);
    setFormWebsite(sponsor.website_url || '');
    setFormFile(null);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (sponsor: Sponsor) => {
    setSelectedSponsor(sponsor);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Leverandører / Logoer</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Leverandører / Logoer</CardTitle>
        <CardDescription>Last opp logoer for leverandører, sponsorer eller samarbeidspartnere</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={() => { resetForm(); setUploadDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />
          Last opp logo
        </Button>

        <div className="rounded-lg border border-border bg-muted/50 p-3 text-sm space-y-1">
          <p className="font-medium">💡 Tips for beste resultat:</p>
          <ul className="text-muted-foreground space-y-0.5 ml-4 list-disc">
            <li>PNG eller SVG med gjennomsiktig bakgrunn</li>
            <li>Kvadratisk eller liggende format (maks 2:1 bredde:høyde)</li>
            <li>Anbefalt størrelse: 400-800px bredde</li>
            <li>Maks filstørrelse: 2 MB</li>
          </ul>
        </div>

        {sponsors.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Ingen leverandører er lagt til ennå.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {sponsors.map((sponsor, index) => (
              <div
                key={sponsor.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="group relative rounded-xl border border-border bg-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-move"
              >
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                
                <div className="flex flex-col items-center gap-3">
                  <div className="w-full h-20 flex items-center justify-center">
                    <img 
                      src={sponsor.logo_url} 
                      alt={sponsor.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  
                  <p className="text-sm font-medium text-center truncate w-full">
                    {sponsor.name}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEditDialog(sponsor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => openDeleteDialog(sponsor)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Last opp leverandørlogo</DialogTitle>
            <DialogDescription>
              Legg til en ny leverandør eller partner
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="upload-name">Bedriftsnavn *</Label>
              <Input
                id="upload-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Bedriftens navn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-file">Logo *</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="upload-file"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Aksepterte formater: PNG, JPG, SVG, WebP (maks 2 MB)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="upload-website">Nettside (valgfritt)</Label>
              <Input
                id="upload-website"
                type="url"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="https://www.bedrift.no"
              />
              <p className="text-xs text-muted-foreground">
                Dersom utfylt kan besøkende klikke på logoen
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleUpload} disabled={uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Last opp
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rediger leverandør</DialogTitle>
            <DialogDescription>
              Oppdater informasjon om leverandøren
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Bedriftsnavn *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Bedriftens navn"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-website">Nettside (valgfritt)</Label>
              <Input
                id="edit-website"
                type="url"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="https://www.bedrift.no"
              />
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              {selectedSponsor && (
                <div className="flex items-center gap-4">
                  <div className="h-16 w-24 flex items-center justify-center rounded border border-border bg-muted p-2">
                    <img 
                      src={selectedSponsor.logo_url} 
                      alt={selectedSponsor.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Last opp ny logo for å erstatte
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleEdit} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Lagre
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett leverandør</AlertDialogTitle>
            <AlertDialogDescription>
              Er du sikker på at du vil slette logoen for {selectedSponsor?.name}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Slett
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}