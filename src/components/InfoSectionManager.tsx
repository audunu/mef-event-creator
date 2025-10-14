import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

interface InfoSection {
  id: string;
  title: string;
  content: string;
  order_index: number;
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
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    order_index: 0,
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
      setSections(data);
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
      });
    } else {
      setEditingSection(null);
      setFormData({
        title: '',
        content: '',
        order_index: sections.length,
      });
    }
    setDialogOpen(true);
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
      toast.error('Kunne ikke lagre info-kort');
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
      toast.error('Kunne ikke slette info-kort');
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
                <div className="flex-1">
                  <h4 className="font-bold text-lg">{section.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {section.content.substring(0, 100)}
                    {section.content.length > 100 && '...'}
                  </p>
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
                <Label htmlFor="content">Innhold (støtter Markdown)</Label>
                <Tabs defaultValue="edit" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="edit">Rediger</TabsTrigger>
                    <TabsTrigger value="preview">Forhåndsvisning</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      placeholder="Skriv innhold her. Du kan bruke Markdown-formatering."
                      className="min-h-[200px]"
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="min-h-[200px] p-4 border rounded-md prose prose-sm max-w-none">
                      {formData.content ? (
                        <ReactMarkdown>{formData.content}</ReactMarkdown>
                      ) : (
                        <p className="text-muted-foreground">Ingen innhold å vise</p>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
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
