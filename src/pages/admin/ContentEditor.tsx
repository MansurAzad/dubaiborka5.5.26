import { useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Edit, Plus, FileText, Eye, EyeOff } from "lucide-react";

const defaultSections = [
  { section_key: "hero_banner", title: "Hero Banner", subtitle: "Premium Islamic Fashion", content: "Discover our exclusive collection", is_active: true },
  { section_key: "announcement_bar", title: "🎉 Free Shipping on orders over ৳5,000!", subtitle: "", content: "", is_active: true },
  { section_key: "about_section", title: "About Dubai Borka House", subtitle: "Premium Quality", content: "We bring you the finest collection of Islamic fashion.", is_active: true },
  { section_key: "special_offer", title: "Special Offer", subtitle: "Up to 50% Off", content: "Limited time offer on selected items", is_active: true },
  { section_key: "footer_info", title: "Dubai Borka House", subtitle: "Premium Islamic Fashion Store", content: "Your trusted destination for Islamic fashion.", is_active: true },
];

const ContentEditor = () => {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState({ title: "", subtitle: "", content: "", image_url: "", is_active: true });

  const { data: contents = [], isLoading } = useQuery({
    queryKey: ["admin-site-content"],
    queryFn: async () => {
      const { data } = await supabase.from("site_content").select("*").order("section_key");
      return data || [];
    },
  });

  const upsertContent = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.from("site_content").upsert(item, { onConflict: "section_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      toast.success("Content saved!");
      setEditItem(null);
    },
    onError: () => toast.error("Failed to save content"),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const existing = contents.map(c => c.section_key);
      const missing = defaultSections.filter(s => !existing.includes(s.section_key));
      if (missing.length === 0) { toast.info("All default sections already exist"); return; }
      const { error } = await supabase.from("site_content").insert(missing);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-content"] });
      toast.success("Default sections created!");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("site_content").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-site-content"] }),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ title: item.title || "", subtitle: item.subtitle || "", content: item.content || "", image_url: item.image_url || "", is_active: item.is_active });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold">Content Editor</h1>
            <p className="text-muted-foreground">ডায়নামিক কন্টেন্ট ম্যানেজমেন্ট</p>
          </div>
          <Button variant="outline" onClick={() => seedDefaults.mutate()} disabled={seedDefaults.isPending}>
            <Plus className="w-4 h-4 mr-2" /> Seed Defaults
          </Button>
        </div>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="w-5 h-5" /> Site Sections</CardTitle></CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">Loading...</p>
            ) : contents.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <p className="text-muted-foreground">No content sections yet.</p>
                <Button onClick={() => seedDefaults.mutate()}>Create Default Sections</Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Section</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Subtitle</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contents.map((item: any) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge section={item.section_key}>{item.section_key.replace(/_/g, " ")}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.title || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{item.subtitle || "—"}</TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={(val) => toggleActive.mutate({ id: item.id, is_active: val })}
                        />
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" onClick={() => openEdit(item)}>
                              <Edit className="w-4 h-4 mr-1" /> Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Edit: {item.section_key.replace(/_/g, " ")}</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm text-muted-foreground">Title</label>
                                <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Subtitle</label>
                                <Input value={form.subtitle} onChange={(e) => setForm(f => ({ ...f, subtitle: e.target.value }))} />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Content</label>
                                <Textarea rows={4} value={form.content} onChange={(e) => setForm(f => ({ ...f, content: e.target.value }))} />
                              </div>
                              <div>
                                <label className="text-sm text-muted-foreground">Image URL</label>
                                <Input value={form.image_url} onChange={(e) => setForm(f => ({ ...f, image_url: e.target.value }))} />
                              </div>
                              <Button
                                className="w-full"
                                onClick={() => {
                                  if (!editItem) return;
                                  upsertContent.mutate({
                                    id: editItem.id,
                                    section_key: editItem.section_key,
                                    ...form,
                                  });
                                }}
                                disabled={upsertContent.isPending}
                              >
                                Save Changes
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

// Simple inline badge for section keys
const Badge = ({ children, section }: { children: React.ReactNode; section: string }) => (
  <span className="inline-block px-2 py-1 text-xs font-mono rounded bg-muted text-muted-foreground capitalize">
    {children}
  </span>
);

export default ContentEditor;
