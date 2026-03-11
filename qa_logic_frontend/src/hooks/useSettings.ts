import { useState } from 'react';
import { SettingsPreferences } from '../types/api';

const SETTINGS_KEY = 'qa_logic_settings';

const defaultSettings: SettingsPreferences = {
  target_count: 12,
  strictness_preset: "Balanced"
};

export function useSettings() {
  const [settings, setSettings] = useState<SettingsPreferences>(() => {
    try {
      const stored = localStorage.getItem(SETTINGS_KEY);
      if (stored) {
        return JSON.parse(stored) as SettingsPreferences;
      }
    } catch {
      // Ignored
    }
    return defaultSettings;
  });

  const updateSettings = (newSettings: Partial<SettingsPreferences>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
  };

  return { settings, updateSettings };
}
