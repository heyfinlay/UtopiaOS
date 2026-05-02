import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookText, Plus, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { templatesApi } from "@/domains/templates/api";
import { queryKeys } from "@/lib/query/keys";
import { refetchAfterTemplateChange } from "@/lib/query/refetchers";

export function VaultPage() {
  const queryClient = useQueryClient();
  const templatesQuery = useQuery({
    queryKey: queryKeys.templates.all(),
    queryFn: templatesApi.list,
    refetchInterval: 20_000,
  });
  const templates = templatesQuery.data?.templates ?? [];
  const activeTemplates = templates.filter((template) => !template.archived);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    category: "Workflow",
    body: "",
  });

  const selectedTemplate =
    activeTemplates.find((template) => template.id === selectedId) ??
    activeTemplates[0] ??
    null;

  useEffect(() => {
    if (!selectedTemplate) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId(selectedTemplate.id);
    setDraft({
      title: selectedTemplate.title,
      category: selectedTemplate.category,
      body: selectedTemplate.body,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTemplate?.id]);

  const createTemplateMutation = useMutation({
    mutationFn: (payload: typeof draft) => templatesApi.create(payload),
    onSuccess: async ({ template }) => {
      await refetchAfterTemplateChange(queryClient);
      setSelectedId(template.id);
      toast.success(`${template.title} created.`);
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: () => {
      if (!selectedTemplate) {
        throw new Error("No template selected.");
      }

      return templatesApi.update(selectedTemplate.id, draft);
    },
    onSuccess: async ({ template }) => {
      await refetchAfterTemplateChange(queryClient);
      toast.success(`${template.title} saved as v${template.version}.`);
    },
  });

  const archiveTemplateMutation = useMutation({
    mutationFn: (templateId: string) => templatesApi.update(templateId, { archived: true }),
    onSuccess: async ({ template }) => {
      await refetchAfterTemplateChange(queryClient);
      toast.success(`${template.title} archived.`);
    },
  });

  return (
    <div className="space-y-4">
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-6 text-white shadow-[0_20px_80px_rgba(3,8,14,0.45)] backdrop-blur-xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-cyan-100/55">
              Vault
            </p>
            <h3 className="mt-3 text-3xl font-semibold tracking-tight">
              Persistent operating templates.
            </h3>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              Prompts, guardrails, and delivery templates now live in the repository so they can
              evolve without code edits.
            </p>
          </div>
          <Button
            className="rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
            onClick={() => {
              setSelectedId(null);
              setDraft({
                title: "New operating template",
                category: "Workflow",
                body: "Document the reusable operating pattern here.",
              });
              createTemplateMutation.mutate({
                title: "New operating template",
                category: "Workflow",
                body: "Document the reusable operating pattern here.",
              });
            }}
          >
            New template
            <Plus className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </motion.section>

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
              Templates
            </p>
            <CardTitle className="mt-2 text-2xl">Versioned artifacts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setSelectedId(template.id)}
                className={`w-full rounded-[1.5rem] border p-4 text-left transition-colors ${
                  selectedTemplate?.id === template.id
                    ? "border-cyan-300/20 bg-cyan-300/10"
                    : "border-white/8 bg-white/4 hover:border-white/14"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium text-white">{template.title}</p>
                  <Badge className="rounded-full border border-white/10 bg-white/5 text-slate-100">
                    v{template.version}
                  </Badge>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">
                  {template.category}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/10 bg-slate-950/70 text-white backdrop-blur-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.32em] text-slate-500">
                Editor
              </p>
              <CardTitle className="mt-2 text-2xl">Template detail</CardTitle>
            </div>
            <BookText className="h-5 w-5 text-cyan-100/70" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[1fr_0.45fr]">
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Title</span>
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, title: event.target.value }))
                  }
                  className="h-11 rounded-2xl border-white/10 bg-white/5"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm text-slate-300">Category</span>
                <Input
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  className="h-11 rounded-2xl border-white/10 bg-white/5"
                />
              </label>
            </div>
            <label className="space-y-2">
              <span className="text-sm text-slate-300">Body</span>
              <Textarea
                value={draft.body}
                onChange={(event) =>
                  setDraft((current) => ({ ...current, body: event.target.value }))
                }
                className="min-h-[340px] rounded-3xl border-white/10 bg-white/5 font-mono text-sm"
              />
            </label>
            <div className="flex flex-wrap justify-end gap-2">
              {selectedTemplate ? (
                <Button
                  variant="outline"
                  className="rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
                  onClick={() => archiveTemplateMutation.mutate(selectedTemplate.id)}
                >
                  Archive
                </Button>
              ) : null}
              <Button
                className="rounded-2xl bg-cyan-200 text-slate-950 hover:bg-cyan-100"
                disabled={!selectedTemplate || updateTemplateMutation.isPending}
                onClick={() => updateTemplateMutation.mutate()}
              >
                Save
                <Save className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
