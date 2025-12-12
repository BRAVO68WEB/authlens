'use client';

import { useStore } from '@/lib/store';
import { Menu, Moon, Sun } from 'lucide-react';

export function Header() {
  const { toggleSidebar, darkMode, toggleDarkMode, providers, selectedProviderId, selectProvider } = useStore();
  const selectedProvider = providers.find(p => p.id === selectedProviderId);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Provider:
            </label>
            <select
              value={selectedProviderId || ''}
              onChange={(e) => selectProvider(e.target.value || null)}
              className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a provider...</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type.toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {selectedProvider && (
            <div className="text-sm">
              <span className="text-gray-500 dark:text-gray-400">Selected: </span>
              <span className="font-medium text-gray-900 dark:text-gray-100">
                {selectedProvider.name}
              </span>
            </div>
          )}

          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}

