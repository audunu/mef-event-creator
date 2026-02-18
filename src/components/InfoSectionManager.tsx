import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

interface InfoSection {
  id: string;
  title: string;
  content: string;
  order_index: number;
  image_url: string | null;
}

interface InfoSectionManagerProps {
  eventId: string;
}

export function InfoSectionManager({ eventId }: InfoSectionManagerProps) {
  const [sections, setSections] = useState<InfoSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<InfoSection | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    order_index: 0,
    image_url: null as string | null,
  });

  useEffect(() => {
    fetchSections();
  }, [eventId]);

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from('info_sections')
      .select('*')
      .eq('event_id', eventId)
      .order('order_index', { ascending: true });

    if (!error && data) {
      setSections(data as InfoSection[]);
    }
    setLoading(false);
  };

  const handleOpenDialog = (section?: InfoSection) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        title: section.title,
        content: section.content,
        order_index: section.order_index,
        image_url: section.image_url ?? null,
      });
    } else {
      setEditingSection(null);
      setFormData({
        title: '',
        content: '',
        order_index: sections.length,
        image_url: null,
      });
    }
    setDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Kun JPG, PNG og WebP er tillatt');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `info-sections/${eventId}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('event-images')
        .getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, image_url: urlData.publicUrl }));
      toast.success('Bilde lastet opp');
    } catch (err: unknown) {
      console.error('Image upload error:', err);
      toast.error('Kunne ikke laste opp bilde');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = () => {
    setFormData((prev) => ({ ...prev, image_url: null }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Tittel er påkrevd');
      return;
    }

    const sectionData = {
      event_id: eventId,
      title: formData.title,
      content: formData.content,
      order_index: formData.order_index,
      image_url: formData.image_url,
    };

    let error;
    if (editingSection) {
      const result = await supabase
        .from('info_sections')
        .update(sectionData)
        .eq('id', editingSection.id);
      error = result.error;
    } else {
      const result = await supabase
        .from('info_sections')
        .insert(sectionData);
      error = result.error;
    }

    if (error) {
      console.error('Info section save error:', error);
      toast.error(`Kunne ikke lagre info-kort: ${error.message}`);
    } else {
      toast.success(editingSection ? 'Info-kort oppdatert' : 'Info-kort opprettet');
      setDialogOpen(false);
      fetchSections();
    }
  };

  const handleDelete = async () => {
    if (!sectionToDelete) return;

    const { error } = await supabase
      .from('info_sections')
      .delete()
      .eq('id', sectionToDelete);

    if (error) {
      console.error('Info section delete error:', error);
      toast.error(`Kunne ikke slette info-kort: ${error.message}`);
    } else {
      toast.success('Info-kort slettet');
      setDeleteDialogOpen(false);
      setSectionToDelete(null);
      fetchSections();
    }
  };

  const openDeleteDialog = (id: string) => {
    setSectionToDelete(id);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return <div>Laster...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Praktisk info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sections.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ingen info-kort lagt til ennå</p>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <div key={section.id} className="flex items-start justify-between p-4 border rounded-lg">
                <div className="flex-1 flex gap-3 items-start">
                  {section.image_url && (
                    <img
                      src={section.image_url}
                      alt={section.title}
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div>
                    <h4 className="font-bold text-lg">{section.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {section.content.substring(0, 100)}
                      {section.content.length > 100 && '...'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenDialog(section)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openDeleteDialog(section.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="mr-2 h-4 w-4" />
              Legg til info-kort
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSection ? 'Rediger info-kort' : 'Nytt info-kort'}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Tittel *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="F.eks. Transport, Overnatting, Wifi"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="content">Innhold</Label>
                <ReactQuill
                  theme="snow"
                  value={formData.content}
                  onChange={(value) => setFormData({ ...formData, content: value })}
                  placeholder="Skriv innhold her..."
                  className="bg-background"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['link'],
                      ['clean']
                    ],
                  }}
                />
              </div>

              {/* Image upload */}
              <div className="space-y-2">
                <Label>Bilde (valgfritt)</Label>
                {formData.image_url ? (
                  <div className="relative inline-block">
                    <img
                      src={formData.image_url}
                      alt="Forhåndsvisning"
                      className="max-h-48 rounded-lg border object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 h-6 w-6"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      Klikk × for å fjerne bildet
                    </p>
                  </div>
                ) : (
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploading ? 'Laster opp...' : 'Last opp bilde'}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG eller WebP. Vises under tekstinnholdet på kortet.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="order">Rekkefølge (valgfritt)</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order_index}
                  onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button onClick={handleSave}>
                  Lagre
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Er du sikker?</AlertDialogTitle>
              <AlertDialogDescription>
                Er du sikker på at du vil slette dette info-kortet? Denne handlingen kan ikke angres.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Avbryt</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Ja, slett</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
