import type { ClientResponse, ClientsResponse, UpdateClientInput } from "@utopia/schemas";

import { request } from "@/lib/api";

export const clientsApi = {
  list: () => request<ClientsResponse>("/api/clients"),
  update: (clientId: string, payload: UpdateClientInput) =>
    request<ClientResponse>(`/api/clients/${clientId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
