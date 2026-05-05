import { useState, useCallback, useMemo } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Edit, Eye, EyeOff, GripVertical,
  LayoutDashboard, Megaphone, Zap, Grid3X3, ShoppingBag,
  Tag, Package, Info, Award, MessageSquare, Instagram, Mail,
  Trash2, Plus, Save, Sparkles, TrendingUp, Star, Flame,
  ShieldCheck, PlayCircle, Layers, Phone, Banknote, Gift,
} from "lucide-react";
import ImageUpload from "@/components/admin/ImageUpload";

interface SiteContent {
  id: string;
  section_key: string;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  is_active: boolean;
  display_order: number;
  updated_at: string;
}

const sectionIcons: Record<string, any> = {
  announcement_bar: Megaphone,
  hero_banner: LayoutDashboard,
  flash_sale: Zap,
  featured_categories: Grid3X3,
  featured_products: ShoppingBag,
  special_offer: Tag,
  bundle_deals: Package,
  about_section: Info,
  why_choose_us: Award,
  testimonials: MessageSquare,
  instagram_feed: Instagram,
  newsletter: Mail,
  new_arrivals: Sparkles,
  trending_products: TrendingUp,
  customer_reviews: Star,
  deal_of_the_day: Flame,
  trust_badges: ShieldCheck,
  video_showcase: PlayCircle,
  popular_categories: Layers,
  trust_guarantee: ShieldCheck,
  floating_contact: Phone,
  exit_intent_popup: Gift,
  zero_advance_popup: Banknote,
  spin_to_win: Sparkles,
};

const sectionLabels: Record<string, string> = {
  announcement_bar: "Announcement Bar",
  hero_banner: "Hero Banner",
  flash_sale: "Flash Sale Timer",
  featured_categories: "Featured Categories",
  featured_products: "Featured Products",
  special_offer: "Special Offer",
  bundle_deals: "Bundle Deals",
  about_section: "About Us",
  why_choose_us: "Why Choose Us",
  testimonials: "Testimonials",
  instagram_feed: "Instagram Feed",
  newsletter: "Newsletter",
  new_arrivals: "New Arrivals",
  trending_products: "Trending Products",
  customer_reviews: "Customer Reviews Showcase",
  deal_of_the_day: "Deal of the Day",
  trust_badges: "Trust Badges",
  video_showcase: "Video Showcase",
  popular_categories: "Popular Categories Carousel",
  trust_guarantee: "Trust Guarantee Banner (১০০% গ্যারান্টি)",
  floating_contact: "Floating Contact Buttons (WhatsApp/Call)",
  exit_intent_popup: "Exit Intent Coupon Popup (একটু দাঁড়ান)",
  zero_advance_popup: "Zero Advance Popup (অগ্রিম ছাড়া)",
  spin_to_win: "Spin to Win Wheel (ভাগ্যের চাকা)",
};

const managedSectionTemplates = [
  {
    section_key: "exit_intent_popup",
    title: "🎁 যাচ্ছেন? একটু দাঁড়ান!",
    subtitle: "অ্যাক্টিভ কুপন থেকে একটি অফার দেখান",
    content: "এই পপআপে ডাটাবেজের অ্যাক্টিভ কুপন কোড দেখানো হবে",
    is_active: true,
  },
  {
    section_key: "spin_to_win",
    title: "🎰 ভাগ্য ঘোরান",
    subtitle: "লাইভ কুপন জেতার সুযোগ",
    content: "অ্যাক্টিভ কুপনগুলো হুইলে দেখানো হবে",
    is_active: true,
  },
  {
    section_key: "zero_advance_popup",
    title: "১ টাকাও অগ্রিম দিতে হবে না!",
    subtitle: "ক্যাশ অন ডেলিভারি সুবিধা",
    content: "সম্পূর্ণ ক্যাশ অন ডেলিভারি\nযেমন দেখবেন, তেমন পাবেন\n১০০% সন্তুষ্টির গ্যারান্টি",
    is_active: true,
  },
] as const;

// Sortable Section Item
const SortableSectionCard = ({
  section,
  onToggle,
  onEdit,
  onDelete,
}: {
  section: SiteContent;
  onToggle: (id: string, active: boolean) => void;
  onEdit: (s: SiteContent) => void;
  onDelete: (id: string) => void;
}) => {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.85 : undefined,
  };

  const Icon = sectionIcons[section.section_key] || LayoutDashboard;
  const label = sectionLabels[section.section_key] || section.section_key.replace(/_/g, " ");

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        className={`transition-all duration-200 ${
          !section.is_active ? "opacity-50" : ""
        } ${isDragging ? "shadow-xl ring-2 ring-primary scale-[1.02]" : ""}`}
      >
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Drag handle */}
            <button
              {...attributes}
              {...listeners}
              className="touch-none cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              aria-label="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </button>

            {/* Icon */}
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground truncate text-sm">{label}</h3>
                <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded hidden md:inline">
                  {section.section_key}
                </span>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {section.title || section.subtitle || "—"}
              </p>
            </div>

            {/* Toggle */}
            <div className="flex items-center gap-1.5">
              {section.is_active ? (
                <Eye className="w-3.5 h-3.5 text-green-500 hidden sm:block" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-muted-foreground hidden sm:block" />
              )}
              <Switch
                checked={section.is_active}
                onCheckedChange={(val) => onToggle(section.id, val)}
              />
            </div>

            {/* Edit */}
            <Button size="sm" variant="outline" className="h-8 px-2 sm:px-3" onClick={() => onEdit(section)}>
              <Edit className="w-3.5 h-3.5 sm:mr-1" />
              <span className="hidden sm:inline text-xs">Edit</span>
            </Button>

            {/* Delete */}
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm("Delete this section?")) onDelete(section.id);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const HomepageSections = () => {
  const queryClient = useQueryClient();
  const [editItem, setEditItem] = useState<SiteContent | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [form, setForm] = useState({ title: "", subtitle: "", content: "", image_url: "" });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: sections = [], isLoading } = useQuery({
    queryKey: ["admin-homepage-sections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("*")
        .order("display_order", { ascending: true });
      if (error) throw error;
      return (data || []) as SiteContent[];
    },
    staleTime: 60 * 1000,
  });

  const sectionIds = useMemo(() => sections.map((s) => s.id), [sections]);
  const missingManagedSections = useMemo(
    () => managedSectionTemplates.filter((template) => !sections.some((section) => section.section_key === template.section_key)),
    [sections]
  );

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("site_content").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, is_active }) => {
      await queryClient.cancelQueries({ queryKey: ["admin-homepage-sections"] });
      const prev = queryClient.getQueryData<SiteContent[]>(["admin-homepage-sections"]);
      queryClient.setQueryData<SiteContent[]>(["admin-homepage-sections"], (old) =>
        old?.map((s) => (s.id === id ? { ...s, is_active } : s))
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-homepage-sections"], ctx.prev);
      toast.error("Update failed");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] }),
  });

  const updateContent = useMutation({
    mutationFn: async (item: Partial<SiteContent> & { id: string }) => {
      const { error } = await supabase.from("site_content").update({
        title: item.title, subtitle: item.subtitle,
        content: item.content, image_url: item.image_url,
        updated_at: new Date().toISOString(),
      }).eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success("Content updated!");
      setEditOpen(false);
      setEditItem(null);
    },
    onError: () => toast.error("Update failed"),
  });

  const reorderSections = useMutation({
    mutationFn: async (newSections: SiteContent[]) => {
      const updates = newSections.map((s, i) => ({
        id: s.id,
        display_order: i,
      }));
      // Batch update all orders
      for (const u of updates) {
        const { error } = await supabase
          .from("site_content")
          .update({ display_order: u.display_order })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success("Order saved!");
    },
    onError: () => toast.error("Reorder failed"),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_content").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["admin-homepage-sections"] });
      const prev = queryClient.getQueryData<SiteContent[]>(["admin-homepage-sections"]);
      queryClient.setQueryData<SiteContent[]>(["admin-homepage-sections"], (old) =>
        old?.filter((s) => s.id !== id)
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(["admin-homepage-sections"], ctx.prev);
      toast.error("Delete failed");
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] }),
  });

  const addSection = useMutation({
    mutationFn: async () => {
      const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.display_order)) : 0;
      const nextManagedSection = missingManagedSections[0];
      const payload = nextManagedSection
        ? { ...nextManagedSection, display_order: maxOrder + 1 }
        : {
            section_key: `custom_section_${Date.now()}`,
            title: "New Section",
            subtitle: "",
            content: "",
            is_active: false,
            display_order: maxOrder + 1,
          };

      const { error } = await supabase.from("site_content").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-sections"] });
      queryClient.invalidateQueries({ queryKey: ["homepage-sections"] });
      toast.success(missingManagedSections.length > 0 ? "Managed popup section added!" : "New section added!");
    },
  });

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = sections.findIndex((s) => s.id === active.id);
      const newIndex = sections.findIndex((s) => s.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const newOrder = arrayMove(sections, oldIndex, newIndex);

      // Optimistic update
      queryClient.setQueryData<SiteContent[]>(
        ["admin-homepage-sections"],
        newOrder.map((s, i) => ({ ...s, display_order: i }))
      );

      // Persist
      reorderSections.mutate(newOrder);
    },
    [sections, queryClient, reorderSections]
  );

  const openEdit = useCallback((item: SiteContent) => {
    setEditItem(item);
    setForm({
      title: item.title || "",
      subtitle: item.subtitle || "",
      content: item.content || "",
      image_url: item.image_url || "",
    });
    setEditOpen(true);
  }, []);

  const handleToggle = useCallback(
    (id: string, is_active: boolean) => toggleActive.mutate({ id, is_active }),
    [toggleActive]
  );

  const handleDelete = useCallback(
    (id: string) => deleteSection.mutate(id),
    [deleteSection]
  );

  return (
    <AdminLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold">Homepage Section Manager</h1>
            <p className="text-muted-foreground text-sm">Drag to reorder • Toggle on/off • Edit content</p>
          </div>
          <Button onClick={() => addSection.mutate()} disabled={addSection.isPending} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> {missingManagedSections.length > 0 ? "Add Missing Popup" : "Add Section"}
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {sections.map((section) => (
                  <SortableSectionCard
                    key={section.id}
                    section={section}
                    onToggle={handleToggle}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {/* Edit Dialog */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Edit: {editItem ? (sectionLabels[editItem.section_key] || editItem.section_key) : ""}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Title</label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Subtitle</label>
                <Input value={form.subtitle} onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Content</label>
                <Textarea rows={4} value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Image</label>
                <ImageUpload
                  value={form.image_url}
                  onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                />
                <Input
                  className="mt-2"
                  value={form.image_url}
                  onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))}
                  placeholder="Or paste image URL..."
                />
                {form.image_url && (
                  <img src={form.image_url} alt="Preview" className="mt-2 h-32 object-cover rounded-lg" />
                )}
              </div>
              <Button
                className="w-full gap-2"
                onClick={() => {
                  if (!editItem) return;
                  updateContent.mutate({ id: editItem.id, ...form });
                }}
                disabled={updateContent.isPending}
              >
                <Save className="w-4 h-4" />
                {updateContent.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default HomepageSections;
