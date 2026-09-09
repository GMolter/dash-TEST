import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import {
  DASHBOARD_MODULES,
  DashboardModuleId,
  DashboardModuleSpan,
  DEFAULT_DASHBOARD_ORDER,
  DEFAULT_DASHBOARD_SPANS,
  PluginId,
} from '../features/plugins/catalog';

export const DASHBOARD_CONFIGURATION_CHANGED_EVENT = 'olio:dashboard-configuration-changed';

export type PluginInstallation = {
  user_id: string;
  plugin_id: string;
  dashboard_enabled: boolean;
  dashboard_order: number;
};

export type StoredDashboardModule = {
  user_id: string;
  module_id: string;
  enabled: boolean;
  order_index: number;
  column_span: DashboardModuleSpan;
};

export type DashboardModule = {
  id: DashboardModuleId;
  name: string;
  description: string;
  enabled: boolean;
  order: number;
  span: DashboardModuleSpan;
  available: boolean;
};

export function resolveDashboardModules(installations: PluginInstallation[], storedModules: StoredDashboardModule[]): DashboardModule[] {
  const installationByPlugin = new Map(installations.map((installation) => [installation.plugin_id, installation]));
  const stored = new Map(storedModules.map((module) => [module.module_id, module]));
  return DASHBOARD_MODULES.map((definition, fallbackOrder) => {
    const saved = stored.get(definition.id);
    const installation = 'pluginId' in definition ? installationByPlugin.get(definition.pluginId) : undefined;
    const available = !('pluginId' in definition) || !!installation;
    const installationAllowsDashboard = !installation || installation.dashboard_enabled;
    return {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      enabled: available && installationAllowsDashboard && (saved?.enabled ?? true),
      order: saved?.order_index ?? installation?.dashboard_order ?? fallbackOrder,
      span: saved?.column_span ?? DEFAULT_DASHBOARD_SPANS[definition.id],
      available,
    };
  }).sort((a, b) => a.order - b.order);
}

type ConfigurationCache = { installations: PluginInstallation[]; modules: StoredDashboardModule[] };
const configurationKey = (userId: string) => `olio-dashboard-configuration-v1:${userId}`;
export function readConfigurationCache(userId: string): ConfigurationCache | null {
  try {
    const value = JSON.parse(localStorage.getItem(configurationKey(userId)) || 'null');
    if (!value || !Array.isArray(value.installations) || !Array.isArray(value.modules)) return null;
    if (!value.installations.every((row: PluginInstallation) => row && row.user_id === userId && typeof row.dashboard_enabled === 'boolean') ||
        !value.modules.every((row: StoredDashboardModule) => row && row.user_id === userId && typeof row.enabled === 'boolean')) return null;
    return value;
  } catch { return null; }
}
function writeConfigurationCache(userId: string, value: ConfigurationCache) {
  try { localStorage.setItem(configurationKey(userId), JSON.stringify(value)); } catch { /* Storage is optional. */ }
}

function emitChange() {
  window.dispatchEvent(new Event(DASHBOARD_CONFIGURATION_CHANGED_EVENT));
}

export function useDashboardConfiguration() {
  const { user } = useAuth();
  const initial = useMemo(() => user ? readConfigurationCache(user.id) : null, [user?.id]);
  const requestId = useRef(0);
  const activeUser = useRef(user?.id);
  activeUser.current = user?.id;
  const [installations, setInstallations] = useState<PluginInstallation[]>(initial?.installations ?? []);
  const [storedModules, setStoredModules] = useState<StoredDashboardModule[]>(initial?.modules ?? []);
  const [loading, setLoading] = useState(!initial);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const request = ++requestId.current;
    if (!user) {
      setInstallations([]);
      setStoredModules([]);
      setLoading(false);
      return;
    }

    const cached = readConfigurationCache(user.id);
    setInstallations(cached?.installations ?? []);
    setStoredModules(cached?.modules ?? []);
    setLoading(!cached);
    const [installationsResult, modulesResult] = await Promise.all([
      supabase.from('user_plugin_installations').select('*').eq('user_id', user.id),
      supabase.from('user_dashboard_modules').select('*').eq('user_id', user.id),
    ]);

    if (request !== requestId.current || activeUser.current !== user.id) return;
    const firstError = installationsResult.error || modulesResult.error;
    if (firstError) {
      setError(`Dashboard configuration is unavailable. Apply the latest Supabase migration. ${firstError.message}`);
    } else {
      writeConfigurationCache(user.id, { installations: installationsResult.data || [], modules: modulesResult.data || [] });
      setError(null);
      setInstallations((installationsResult.data || []) as PluginInstallation[]);
      setStoredModules((modulesResult.data || []) as StoredDashboardModule[]);
    }
    setLoading(false);
  }, [user]);

  useLayoutEffect(() => {
    void refresh();
    const onChange = () => void refresh();
    window.addEventListener(DASHBOARD_CONFIGURATION_CHANGED_EVENT, onChange);
    const onStorage = (event: StorageEvent) => { if (user && event.key === configurationKey(user.id)) { const cached = readConfigurationCache(user.id); if (cached) { setInstallations(cached.installations); setStoredModules(cached.modules); setLoading(false); } } };
    window.addEventListener('storage', onStorage);
    return () => { ++requestId.current; window.removeEventListener('storage', onStorage); window.removeEventListener(DASHBOARD_CONFIGURATION_CHANGED_EVENT, onChange); };
  }, [refresh]);

  const installedPluginIds = useMemo(
    () => new Set(installations.map((installation) => installation.plugin_id)),
    [installations],
  );

  const modules = useMemo<DashboardModule[]>(() => resolveDashboardModules(installations, storedModules), [installations, storedModules]);

  const installPlugin = useCallback(async (pluginId: PluginId) => {
    if (!user) return false;
    setSyncing(true);
    setError(null);
    const { error: installError } = await supabase.from('user_plugin_installations').upsert({
      user_id: user.id,
      plugin_id: pluginId,
      dashboard_enabled: true,
      dashboard_order: 0,
      updated_at: new Date().toISOString(),
    });
    setSyncing(false);
    if (installError) {
      setError(installError.message);
      return false;
    }
    await refresh();
    emitChange();
    return true;
  }, [user, refresh]);

  const uninstallPlugin = useCallback(async (pluginId: PluginId) => {
    if (!user) return false;
    setSyncing(true);
    setError(null);
    const { error: uninstallError } = await supabase
      .from('user_plugin_installations')
      .delete()
      .eq('user_id', user.id)
      .eq('plugin_id', pluginId);
    setSyncing(false);
    if (uninstallError) {
      setError(uninstallError.message);
      return false;
    }
    await refresh();
    emitChange();
    return true;
  }, [user, refresh]);

  const updateModule = useCallback(async (moduleId: DashboardModuleId, enabled: boolean) => {
    if (!user) return false;
    const current = modules.find((module) => module.id === moduleId);
    setSyncing(true);
    const { error: updateError } = await supabase.from('user_dashboard_modules').upsert({
      user_id: user.id,
      module_id: moduleId,
      enabled,
      order_index: current?.order ?? DEFAULT_DASHBOARD_ORDER.indexOf(moduleId),
      column_span: current?.span ?? DEFAULT_DASHBOARD_SPANS[moduleId],
      updated_at: new Date().toISOString(),
    });
    setSyncing(false);
    if (updateError) {
      setError(updateError.message);
      return false;
    }
    await refresh();
    emitChange();
    return true;
  }, [modules, user, refresh]);

  const moveModule = useCallback(async (moduleId: DashboardModuleId, direction: 'up' | 'down') => {
    if (!user) return false;
    const available = modules.filter((module) => module.available && module.id !== 'tasks');
    const index = available.findIndex((module) => module.id === moduleId);
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (index < 0 || swapIndex < 0 || swapIndex >= available.length) return false;
    const reordered = [...available];
    [reordered[index], reordered[swapIndex]] = [reordered[swapIndex], reordered[index]];
    setSyncing(true);
    const { error: moveError } = await supabase.from('user_dashboard_modules').upsert(
      reordered.map((module, orderIndex) => ({
        user_id: user.id,
        module_id: module.id,
        enabled: module.enabled,
        order_index: orderIndex,
        column_span: module.span,
        updated_at: new Date().toISOString(),
      })),
    );
    setSyncing(false);
    if (moveError) {
      setError(moveError.message);
      return false;
    }
    await refresh();
    emitChange();
    return true;
  }, [modules, user, refresh]);

  const reorderModules = useCallback(async (moduleIds: DashboardModuleId[]) => {
    if (!user) return false;
    const availableById = new Map(modules.filter((module) => module.available && module.id !== 'tasks').map((module) => [module.id, module]));
    const ordered = moduleIds.map((id) => availableById.get(id)).filter((module): module is DashboardModule => !!module);
    if (ordered.length !== availableById.size) return false;
    setSyncing(true);
    const { error: reorderError } = await supabase.from('user_dashboard_modules').upsert(
      ordered.map((module, orderIndex) => ({
        user_id: user.id,
        module_id: module.id,
        enabled: module.enabled,
        order_index: orderIndex,
        column_span: module.span,
        updated_at: new Date().toISOString(),
      })),
    );
    setSyncing(false);
    if (reorderError) {
      setError(reorderError.message);
      return false;
    }
    await refresh();
    emitChange();
    return true;
  }, [modules, user, refresh]);

  const updateModuleSpan = useCallback(async (moduleId: DashboardModuleId, span: DashboardModuleSpan) => {
    if (!user) return false;
    const current = modules.find((module) => module.id === moduleId);
    if (!current) return false;
    setSyncing(true);
    const { error: resizeError } = await supabase.from('user_dashboard_modules').upsert({
      user_id: user.id,
      module_id: moduleId,
      enabled: current.enabled,
      order_index: current.order,
      column_span: span,
      updated_at: new Date().toISOString(),
    });
    setSyncing(false);
    if (resizeError) {
      setError(resizeError.message);
      return false;
    }
    await refresh();
    emitChange();
    return true;
  }, [modules, user, refresh]);

  const resetLayout = useCallback(async () => {
    if (!user) return false;
    setSyncing(true);
    setError(null);
    const availableById = new Map(modules.map((module) => [module.id, module.available]));
    const { error: resetError } = await supabase.from('user_dashboard_modules').upsert(
      DEFAULT_DASHBOARD_ORDER.map((moduleId, orderIndex) => ({
        user_id: user.id,
        module_id: moduleId,
        enabled: availableById.get(moduleId) ?? false,
        order_index: orderIndex,
        column_span: DEFAULT_DASHBOARD_SPANS[moduleId],
        updated_at: new Date().toISOString(),
      })),
    );
    setSyncing(false);
    if (resetError) {
      setError(resetError.message);
      return false;
    }
    await refresh();
    emitChange();
    return true;
  }, [modules, user, refresh]);

  return {
    loading,
    syncing,
    error,
    modules,
    installedPluginIds,
    installPlugin,
    uninstallPlugin,
    updateModule,
    moveModule,
    reorderModules,
    updateModuleSpan,
    resetLayout,
    refresh,
  };
}
