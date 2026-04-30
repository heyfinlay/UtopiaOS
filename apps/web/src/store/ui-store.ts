import { create } from "zustand";

type UiStore = {
  createLeadOpen: boolean;
  importLeadsOpen: boolean;
  leadSearch: string;
  priorityFilter: "all" | "critical" | "high" | "normal";
  setCreateLeadOpen: (open: boolean) => void;
  setImportLeadsOpen: (open: boolean) => void;
  setLeadSearch: (search: string) => void;
  setPriorityFilter: (
    filter: UiStore["priorityFilter"],
  ) => void;
};

export const useUiStore = create<UiStore>((set) => ({
  createLeadOpen: false,
  importLeadsOpen: false,
  leadSearch: "",
  priorityFilter: "all",
  setCreateLeadOpen: (createLeadOpen) => set({ createLeadOpen }),
  setImportLeadsOpen: (importLeadsOpen) => set({ importLeadsOpen }),
  setLeadSearch: (leadSearch) => set({ leadSearch }),
  setPriorityFilter: (priorityFilter) => set({ priorityFilter }),
}));
