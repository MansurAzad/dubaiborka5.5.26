import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Plus, Trash2, Loader2, CheckCircle2, Pencil, Save, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Scope = "customer" | "admin";

interface ProviderRow {
  id: string;
  scope: Scope;
  provider_name: string;
  base_url: string;
  api_key: string;
  model: string;
  extra_headers: Record<string, string> | null;
  is_active: boolean;
  notes: string | null;
}

const PRESETS = [
  { name: "DeepSeek", base_url: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  { name: "Kimi (Moonshot)", base_url: "https://api.moonshot.cn/v1", model: "moonshot-v1-8k" },
  { name: "Qwen (DashScope)", base_url: "https://dashscope.aliyuncs.com/compatible-mode/v1", model: "qwen-plus" },
  { name: "OpenCode Zen", base_url: "https://api.opencode.ai/zen/v1", model: "zen-default" },
  { name: "OpenRouter", base_url: "https://openrouter.ai/api/v1", model: "openrouter/auto" },
  { name: "Groq", base_url: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { name: "Together AI", base_url: "https://api.together.xyz/v1", model: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { name: "Custom (OpenAI-compatible)", base_url: "", model: "" },
];

const emptyForm = {
  scope: "customer" as Scope,
  provider_name: "",
  base_url: "",
  api_key: "",
  model: "",
  notes: "",
  is_active: true,
};

const AIProviderSettings = () => {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: providers, isLoading } = useQuery({
    queryKey: ["ai-providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_provider_settings" as any)
        .select("*")
        .order("scope")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ProviderRow[];
    },
  });

  const applyPreset = (name: string) => {
    const p = PRESETS.find((x) => x.name === name);
    if (!p) return;
    setForm((f) => ({
      ...f,
      provider_name: p.name === "Custom (OpenAI-compatible)" ? f.provider_name : p.name,
      base_url: p.base_url || f.base_url,
      model: p.model || f.model,
    }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const startEdit = (row: ProviderRow) => {
    setEditingId(row.id);
    setForm({
      scope: row.scope,
      provider_name: row.provider_name,
      base_url: row.base_url,
      api_key: row.api_key,
      model: row.model,
      notes: row.notes || "",
      is_active: row.is_active,
    });
  };

  const handleSave = async () => {
    if (!form.provider_name.trim() || !form.base_url.trim() || !form.api_key.trim() || !form.model.trim()) {
      toast({ title: "অসম্পূর্ণ", description: "Provider name, Base URL, API key এবং Model সব দিতে হবে।", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      // If activating, deactivate other rows in same scope
      if (form.is_active) {
        await supabase
          .from("ai_provider_settings" as any)
          .update({ is_active: false })
          .eq("scope", form.scope)
          .neq("id", editingId || "00000000-0000-0000-0000-000000000000");
      }
      const payload = {
        scope: form.scope,
        provider_name: form.provider_name.trim(),
        base_url: form.base_url.trim(),
        api_key: form.api_key.trim(),
        model: form.model.trim(),
        notes: form.notes.trim() || null,
        is_active: form.is_active,
      };
      const res = editingId
        ? await supabase.from("ai_provider_settings" as any).update(payload).eq("id", editingId)
        : await supabase.from("ai_provider_settings" as any).insert(payload);
      if (res.error) throw res.error;
      toast({ title: "সফল", description: editingId ? "Provider আপডেট হয়েছে" : "Provider যুক্ত হয়েছে" });
      resetForm();
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (row: ProviderRow, next: boolean) => {
    try {
      if (next) {
        await supabase
          .from("ai_provider_settings" as any)
          .update({ is_active: false })
          .eq("scope", row.scope)
          .neq("id", row.id);
      }
      const { error } = await supabase
        .from("ai_provider_settings" as any)
        .update({ is_active: next })
        .eq("id", row.id);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["ai-providers"] });
    } catch (e: any) {
      toast({ title: "ত্রুটি", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this provider configuration?")) return;
    const { error } = await supabase.from("ai_provider_settings" as any).delete().eq("id", id);
    if (error) toast({ title: "ত্রুটি", description: error.message, variant: "destructive" });
    qc.invalidateQueries({ queryKey: ["ai-providers"] });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-primary" />
          <CardTitle>Custom AI Providers</CardTitle>
        </div>
        <CardDescription>
          DeepSeek, Kimi, Qwen, OpenCode Zen বা যেকোনো OpenAI-compatible API চ্যাটবট ও অ্যাডমিন এজেন্টে ব্যবহার করুন।
          কোনো active provider না থাকলে ডিফল্ট Lovable AI ব্যবহৃত হবে।
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form */}
        <div className="rounded-lg border p-4 space-y-4 bg-muted/30">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">{editingId ? "Edit provider" : "Add a provider"}</h4>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetForm}>
                <X className="w-4 h-4 mr-1" /> Cancel
              </Button>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Use for (Scope)</Label>
              <Select value={form.scope} onValueChange={(v: Scope) => setForm({ ...form, scope: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer Chatbot</SelectItem>
                  <SelectItem value="admin">Admin AI Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Preset</Label>
              <Select onValueChange={applyPreset}>
                <SelectTrigger><SelectValue placeholder="Choose a preset (optional)" /></SelectTrigger>
                <SelectContent>
                  {PRESETS.map((p) => (
                    <SelectItem key={p.name} value={p.name}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Provider name</Label>
              <Input value={form.provider_name} onChange={(e) => setForm({ ...form, provider_name: e.target.value })} placeholder="DeepSeek" />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} placeholder="deepseek-chat" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Base URL (OpenAI-compatible, without /chat/completions)</Label>
            <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://api.deepseek.com/v1" />
          </div>

          <div className="space-y-2">
            <Label>API Key</Label>
            <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." />
          </div>

          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={(c) => setForm({ ...form, is_active: c })} />
              <Label>Set as active for this scope</Label>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              {editingId ? "Update" : "Add Provider"}
            </Button>
          </div>
        </div>

        {/* List */}
        <div className="space-y-3">
          <h4 className="font-medium">Configured providers</h4>
          {isLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin" /></div>
          ) : !providers || providers.length === 0 ? (
            <p className="text-sm text-muted-foreground">কোনো custom provider নেই — ডিফল্ট Lovable AI ব্যবহার হচ্ছে।</p>
          ) : (
            <div className="space-y-2">
              {providers.map((row) => (
                <div key={row.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">{row.provider_name}</span>
                      <Badge variant="outline">{row.scope === "customer" ? "Customer" : "Admin"}</Badge>
                      {row.is_active && (
                        <Badge className="bg-green-600 hover:bg-green-700">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{row.model} · {row.base_url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={row.is_active} onCheckedChange={(c) => toggleActive(row, c)} />
                    <Button variant="ghost" size="icon" onClick={() => startEdit(row)}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(row.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default AIProviderSettings;
