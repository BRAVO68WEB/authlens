/**
 * Global state management with Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  ProviderConfig,
  FlowRun,
  RequestPreset,
  ClaimRuleSet,
  Workspace,
  ProtocolType,
} from './types';
import { generateId, now } from './utils';

/**
 * Workspace Tab
 */
export interface WorkspaceTab {
  id: string;
  title: string;
  path: string;
  protocol?: ProtocolType;
  closable: boolean;
}

/**
 * Store interface
 */
interface AppStore {
  // Providers
  providers: ProviderConfig[];
  selectedProviderId: string | null;
  addProvider: (provider: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProvider: (id: string, updates: Partial<ProviderConfig>) => void;
  deleteProvider: (id: string) => void;
  selectProvider: (id: string | null) => void;
  getProvider: (id: string) => ProviderConfig | undefined;

  // Flow runs
  flowRuns: FlowRun[];
  currentFlowRun: FlowRun | null;
  startFlowRun: (run: Omit<FlowRun, 'id' | 'startedAt'>) => void;
  updateFlowRun: (id: string, updates: Partial<FlowRun>) => void;
  completeFlowRun: (id: string) => void;
  deleteFlowRun: (id: string) => void;
  setCurrentFlowRun: (run: FlowRun | null) => void;

  // Request presets
  presets: RequestPreset[];
  addPreset: (preset: Omit<RequestPreset, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePreset: (id: string, updates: Partial<RequestPreset>) => void;
  deletePreset: (id: string) => void;
  getPresetsByProvider: (providerId: string) => RequestPreset[];

  // Claim rule sets
  claimRuleSets: ClaimRuleSet[];
  addClaimRuleSet: (ruleSet: Omit<ClaimRuleSet, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateClaimRuleSet: (id: string, updates: Partial<ClaimRuleSet>) => void;
  deleteClaimRuleSet: (id: string) => void;

  // Workspace
  exportWorkspace: () => Workspace;
  importWorkspace: (workspace: Workspace) => void;
  clearWorkspace: () => void;

  // UI state
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  darkMode: boolean;
  toggleDarkMode: () => void;

  // Workspace tabs
  tabs: WorkspaceTab[];
  activeTabId: string;
  openTab: (tab: Omit<WorkspaceTab, 'id'>) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
}

const DASHBOARD_TAB: WorkspaceTab = {
  id: 'dashboard',
  title: 'Dashboard',
  path: '/',
  closable: false,
};

/**
 * Create the store
 */
export const useStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Initial state
      providers: [],
      selectedProviderId: null,
      flowRuns: [],
      currentFlowRun: null,
      presets: [],
      claimRuleSets: [],
      sidebarOpen: true,
      darkMode: true,

      // Workspace tabs
      tabs: [DASHBOARD_TAB],
      activeTabId: 'dashboard',

      // Provider actions
      addProvider: (provider) => {
        const newProvider: ProviderConfig = {
          ...provider,
          id: generateId(),
          redirectUris: provider.redirectUris || [],
          scopes: provider.scopes || [],
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({
          providers: [...state.providers, newProvider],
        }));
      },

      updateProvider: (id, updates) => {
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: now() } : p
          ),
        }));
      },

      deleteProvider: (id) => {
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
          selectedProviderId:
            state.selectedProviderId === id ? null : state.selectedProviderId,
        }));
      },

      selectProvider: (id) => {
        set({ selectedProviderId: id });
      },

      getProvider: (id) => {
        return get().providers.find((p) => p.id === id);
      },

      // Flow run actions
      startFlowRun: (run) => {
        const newRun: FlowRun = {
          ...run,
          id: generateId(),
          startedAt: now(),
        };
        set((state) => ({
          flowRuns: [...state.flowRuns, newRun],
          currentFlowRun: newRun,
        }));
      },

      updateFlowRun: (id, updates) => {
        set((state) => ({
          flowRuns: state.flowRuns.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
          currentFlowRun:
            state.currentFlowRun?.id === id
              ? { ...state.currentFlowRun, ...updates }
              : state.currentFlowRun,
        }));
      },

      completeFlowRun: (id) => {
        set((state) => ({
          flowRuns: state.flowRuns.map((r) =>
            r.id === id
              ? { ...r, status: 'completed' as const, completedAt: now() }
              : r
          ),
        }));
      },

      deleteFlowRun: (id) => {
        set((state) => ({
          flowRuns: state.flowRuns.filter((r) => r.id !== id),
          currentFlowRun:
            state.currentFlowRun?.id === id ? null : state.currentFlowRun,
        }));
      },

      setCurrentFlowRun: (run) => {
        set({ currentFlowRun: run });
      },

      // Preset actions
      addPreset: (preset) => {
        const newPreset: RequestPreset = {
          ...preset,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({
          presets: [...state.presets, newPreset],
        }));
      },

      updatePreset: (id, updates) => {
        set((state) => ({
          presets: state.presets.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: now() } : p
          ),
        }));
      },

      deletePreset: (id) => {
        set((state) => ({
          presets: state.presets.filter((p) => p.id !== id),
        }));
      },

      getPresetsByProvider: (providerId) => {
        return get().presets.filter((p) => p.providerId === providerId);
      },

      // Claim rule set actions
      addClaimRuleSet: (ruleSet) => {
        const newRuleSet: ClaimRuleSet = {
          ...ruleSet,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        };
        set((state) => ({
          claimRuleSets: [...state.claimRuleSets, newRuleSet],
        }));
      },

      updateClaimRuleSet: (id, updates) => {
        set((state) => ({
          claimRuleSets: state.claimRuleSets.map((rs) =>
            rs.id === id ? { ...rs, ...updates, updatedAt: now() } : rs
          ),
        }));
      },

      deleteClaimRuleSet: (id) => {
        set((state) => ({
          claimRuleSets: state.claimRuleSets.filter((rs) => rs.id !== id),
        }));
      },

      // Workspace actions
      exportWorkspace: () => {
        const state = get();
        return {
          version: '1.0.0',
          name: 'AuthLens Workspace',
          providers: state.providers,
          presets: state.presets,
          claimRuleSets: state.claimRuleSets,
          exportedAt: now(),
        };
      },

      importWorkspace: (workspace) => {
        set({
          providers: workspace.providers || [],
          presets: workspace.presets || [],
          claimRuleSets: workspace.claimRuleSets || [],
        });
      },

      clearWorkspace: () => {
        set({
          providers: [],
          selectedProviderId: null,
          flowRuns: [],
          currentFlowRun: null,
          presets: [],
          claimRuleSets: [],
        });
      },

      // UI actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }));
      },

      toggleDarkMode: () => {
        set((state) => ({ darkMode: !state.darkMode }));
      },

      // Workspace tab actions
      openTab: (tab) => {
        const state = get();
        const existing = state.tabs.find((t) => t.path === tab.path);
        if (existing) {
          set({ activeTabId: existing.id });
          return;
        }
        const newTab: WorkspaceTab = { ...tab, id: generateId() };
        set((state) => ({
          tabs: [...state.tabs, newTab],
          activeTabId: newTab.id,
        }));
      },

      closeTab: (id) => {
        const state = get();
        const tab = state.tabs.find((t) => t.id === id);
        if (!tab || !tab.closable) return;

        const newTabs = state.tabs.filter((t) => t.id !== id);
        const newActiveTabId =
          state.activeTabId === id
            ? newTabs[newTabs.length - 1]?.id || 'dashboard'
            : state.activeTabId;
        set({ tabs: newTabs, activeTabId: newActiveTabId });
      },

      setActiveTab: (id) => {
        set({ activeTabId: id });
      },
    }),
    {
      name: 'authlens-storage',
      partialize: (state) => ({
        providers: state.providers,
        presets: state.presets,
        claimRuleSets: state.claimRuleSets,
        selectedProviderId: state.selectedProviderId,
        sidebarOpen: state.sidebarOpen,
        darkMode: state.darkMode,
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
);
