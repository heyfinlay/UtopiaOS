import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { createLeadInputSchema, type CreateLeadInput } from "@utopia/schemas";

type ImportLeadsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type ParsedImport = {
  leads: CreateLeadInput[];
  errors: string[];
};

const headerAliases: Record<string, keyof CreateLeadInput> = {
  contact: "name",
  contact_name: "name",
  full_name: "name",
  lead: "name",
  name: "name",
  company: "company",
  business: "company",
  organisation: "company",
  organization: "company",
  website: "website",
  url: "website",
  source: "source",
  channel: "source",
  priority: "priority",
  notes: "notes",
  context: "notes",
  pain_point: "notes",
};

const normalizeHeader = (header: string) =>
  header.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const parseCsv = (text: string) => {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(field.trim());
      if (row.some((value) => value.length > 0)) {
        rows.push(row);
      }
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field.trim());
  if (row.some((value) => value.length > 0)) {
    rows.push(row);
  }

  return rows;
};

const parseImport = (text: string): ParsedImport => {
  const rows = parseCsv(text);

  if (rows.length < 2) {
    return {
      leads: [],
      errors: ["CSV must include a header row and at least one lead row."],
    };
  }

  const headers = rows[0].map((header) => headerAliases[normalizeHeader(header)]);
  const errors: string[] = [];
  const leads: CreateLeadInput[] = [];

  rows.slice(1).forEach((row, rowIndex) => {
    const raw: Record<string, string> = {};

    row.forEach((value, columnIndex) => {
      const field = headers[columnIndex];

      if (field) {
        raw[field] = value;
      }
    });

    const parsed = createLeadInputSchema.safeParse(raw);

    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "row"}: ${issue.message}`)
        .join("; ");
      errors.push(`Row ${rowIndex + 2}: ${detail}`);
      return;
    }

    leads.push(parsed.data);
  });

  return { leads, errors };
};

export function ImportLeadsDialog({
  open,
  onOpenChange,
}: ImportLeadsDialogProps) {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedImport, setParsedImport] = useState<ParsedImport>({
    leads: [],
    errors: [],
  });

  const previewLeads = useMemo(
    () => parsedImport.leads.slice(0, 4),
    [parsedImport.leads],
  );

  const importMutation = useMutation({
    mutationFn: api.importLeads,
    onSuccess: async ({ leads }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["leads"] }),
      ]);
      toast.success(`${leads.length} lead${leads.length === 1 ? "" : "s"} imported.`);
      setFileName(null);
      setParsedImport({ leads: [], errors: [] });
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Lead import failed.");
    },
  });

  const handleFile = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    const text = await file.text();
    setFileName(file.name);
    setParsedImport(parseImport(text));
  };

  const canImport =
    parsedImport.leads.length > 0 &&
    parsedImport.errors.length === 0 &&
    !importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-white/10 bg-slate-950/95 text-white backdrop-blur-xl sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-semibold tracking-tight">
            Import Leads From CSV
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Use columns for name, company, website, source, priority, and notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <label className="flex min-h-[148px] cursor-pointer flex-col items-center justify-center rounded-3xl border border-dashed border-white/12 bg-white/4 px-5 py-8 text-center transition-colors hover:bg-white/6">
            <Upload className="h-6 w-6 text-cyan-100/70" />
            <span className="mt-4 text-base font-medium text-white">
              {fileName ?? "Choose a CSV file"}
            </span>
            <span className="mt-2 text-sm leading-6 text-slate-400">
              Required columns: name and company. Priority accepts normal, high, or critical.
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(event) => handleFile(event.target.files?.[0])}
            />
          </label>

          {parsedImport.errors.length > 0 ? (
            <div className="max-h-44 overflow-y-auto rounded-2xl border border-rose-300/20 bg-rose-300/8 p-4">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-rose-100/70">
                Fix Before Import
              </p>
              <div className="mt-3 space-y-2">
                {parsedImport.errors.map((error) => (
                  <p key={error} className="text-sm leading-6 text-rose-100">
                    {error}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {previewLeads.length > 0 ? (
            <div className="rounded-2xl border border-white/8 bg-white/4 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.28em] text-slate-500">
                  Preview
                </p>
                <p className="text-sm text-slate-300">
                  {parsedImport.leads.length} ready to import
                </p>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {previewLeads.map((lead, index) => (
                  <div
                    key={`${lead.company}-${lead.name}-${index}`}
                    className="rounded-2xl border border-white/8 bg-slate-950/70 p-4"
                  >
                    <p className="font-medium text-white">{lead.company}</p>
                    <p className="mt-1 text-sm text-slate-400">{lead.name}</p>
                    <p className="mt-3 text-xs uppercase tracking-[0.24em] text-cyan-100/60">
                      {lead.priority}
                    </p>
                  </div>
                ))}
              </div>
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
              type="button"
              className="rounded-2xl bg-emerald-300 text-slate-950 hover:bg-emerald-200"
              disabled={!canImport}
              onClick={() => importMutation.mutate({ leads: parsedImport.leads })}
            >
              {importMutation.isPending ? "Importing..." : "Import leads"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
