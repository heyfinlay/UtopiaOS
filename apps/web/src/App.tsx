import { Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { EmptyModulePanel } from "@/components/empty-module-panel";
import { CommandCenterPage } from "@/pages/command-center-page";
import { LeadsPage } from "@/pages/leads-page";

function ShellLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<ShellLayout />}>
        <Route index element={<CommandCenterPage />} />
        <Route path="/leads" element={<LeadsPage />} />
        <Route path="/leads/:leadId" element={<LeadsPage />} />
        <Route
          path="/clients"
          element={
            <EmptyModulePanel
              eyebrow="Clients"
              title="Client workspaces come online after the lead loop is stable."
              description="The next slice will extend this shell into audit notes, delivery roadmaps, and linked mission planning."
            />
          }
        />
        <Route
          path="/missions"
          element={
            <EmptyModulePanel
              eyebrow="Missions"
              title="Mission progression is seeded from the vertical slice already."
              description="The dedicated missions screen will land once the command center, lead research, and client workflow all share the same reward loop."
            />
          }
        />
        <Route
          path="/vault"
          element={
            <EmptyModulePanel
              eyebrow="Template Vault"
              title="Scripts, audits, and proposal templates will live here."
              description="For now the app stores the tactical execution path first, then expands into reusable content systems."
            />
          }
        />
        <Route
          path="/agents"
          element={
            <EmptyModulePanel
              eyebrow="Agent Control"
              title="The control room is partially visible in the command center."
              description="A full screen for approvals, logs, and failure handling follows after the first research workflow is stable."
            />
          }
        />
      </Route>
    </Routes>
  );
}

