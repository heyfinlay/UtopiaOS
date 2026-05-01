import { Outlet, Route, Routes } from "react-router-dom";

import { AuthGate } from "@/components/auth-gate";
import { AppShell } from "@/components/app-shell";
import { AgentsPage } from "@/pages/agents-page";
import { ClientsPage } from "@/pages/clients-page";
import { CommandCenterPage } from "@/pages/command-center-page";
import { LeadsPage } from "@/pages/leads-page";
import { MissionsPage } from "@/pages/missions-page";
import { VaultPage } from "@/pages/vault-page";

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthGate>
      <Routes>
        <Route element={<ShellLayout />}>
          <Route index element={<CommandCenterPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/leads/:leadId" element={<LeadsPage />} />
          <Route path="/clients" element={<ClientsPage />} />
          <Route path="/missions" element={<MissionsPage />} />
          <Route path="/vault" element={<VaultPage />} />
          <Route path="/agents" element={<AgentsPage />} />
        </Route>
      </Routes>
    </AuthGate>
  );
}
