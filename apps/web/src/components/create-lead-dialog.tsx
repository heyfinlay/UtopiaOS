import { startTransition, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { api } from "@/lib/api";
import { createLeadInputSchema } from "@utopia/schemas";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type LeadFormValues = {
  name: string;
  company: string;
  website: string;
  source: string;
  priority: "critical" | "high" | "normal";
  notes: string;
};

type CreateLeadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateLeadDialog({
  open,
  onOpenChange,
}: CreateLeadDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<LeadFormValues>({
    defaultValues: {
      name: "",
      company: "",
      website: "",
      source: "",
      priority: "normal",
      notes: "",
    },
  });

  const createLeadMutation = useMutation({
    mutationFn: api.createLead,
    onSuccess: async ({ lead }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
      ]);
      toast.success(`Lead created for ${lead.company}.`);
      reset();
      onOpenChange(false);
      startTransition(() => navigate(`/leads/${lead.id}`));
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Lead creation failed.");
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const parsed = createLeadInputSchema.safeParse(values);

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        const field = issue.path[0];

        if (typeof field === "string") {
          setError(field as keyof LeadFormValues, {
            message: issue.message,
          });
        }
      });

      setFormError("Tighten the lead details before deploying the record.");
      return;
    }

    await createLeadMutation.mutateAsync(parsed.data);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950/95 text-white backdrop-blur-xl sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Deploy New Lead
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Capture the prospect cleanly, then push it into the research loop.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Contact</label>
              <Input
                {...register("name")}
                className="h-11 rounded-2xl border-white/10 bg-white/5"
                placeholder="Finlay Sturzaker"
              />
              {errors.name ? (
                <p className="text-xs text-rose-300">{errors.name.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Company</label>
              <Input
                {...register("company")}
                className="h-11 rounded-2xl border-white/10 bg-white/5"
                placeholder="Temporary Utopia"
              />
              {errors.company ? (
                <p className="text-xs text-rose-300">{errors.company.message}</p>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Website</label>
              <Input
                {...register("website")}
                className="h-11 rounded-2xl border-white/10 bg-white/5"
                placeholder="https://company.com"
              />
              {errors.website ? (
                <p className="text-xs text-rose-300">{errors.website.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">Priority</label>
              <select
                {...register("priority")}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-3 text-sm text-slate-100 outline-none"
              >
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Source</label>
            <Input
              {...register("source")}
              className="h-11 rounded-2xl border-white/10 bg-white/5"
              placeholder="Referral, outbound reply, cold DM"
            />
            {errors.source ? (
              <p className="text-xs text-rose-300">{errors.source.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Context</label>
            <Textarea
              {...register("notes")}
              className="min-h-[120px] rounded-3xl border-white/10 bg-white/5"
              placeholder="Capture the pain point, buying signal, or why this account matters."
            />
            {errors.notes ? (
              <p className="text-xs text-rose-300">{errors.notes.message}</p>
            ) : null}
          </div>

          {formError ? (
            <div className="rounded-2xl border border-rose-300/20 bg-rose-300/8 px-4 py-3 text-sm text-rose-100">
              {formError}
            </div>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl border-white/10 bg-white/4 text-slate-100 hover:bg-white/10"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
              disabled={createLeadMutation.isPending}
            >
              {createLeadMutation.isPending ? "Deploying..." : "Create lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

