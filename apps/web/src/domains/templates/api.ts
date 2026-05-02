import type {
  CreateTemplateInput,
  TemplateResponse,
  TemplatesResponse,
  UpdateTemplateInput,
} from "@utopia/schemas";

import { request } from "@/lib/api";

export const templatesApi = {
  list: () => request<TemplatesResponse>("/api/templates"),
  create: (payload: CreateTemplateInput) =>
    request<TemplateResponse>("/api/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (templateId: string, payload: UpdateTemplateInput) =>
    request<TemplateResponse>(`/api/templates/${templateId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
