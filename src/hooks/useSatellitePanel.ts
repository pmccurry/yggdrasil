import { useCallback } from 'react';
import { useWorkspaceContext } from '../store/WorkspaceContext';
import { PANEL_REGISTRY } from '../panels/registry';
import type { SatelliteWindowInfo } from '../types/panels';
import {
  openSatelliteWindow,
  closeSatelliteWindow,
  getSatelliteWindows,
  emitRecallRequested,
} from '../shell/satellite';

export function useSatellitePanel() {
  const { activeWorkspace, state, dispatch } = useWorkspaceContext();

  const popOut = useCallback(async (slotIndex: number) => {
    if (!activeWorkspace) return;
    const panel = activeWorkspace.layout.panels[slotIndex];
    if (!panel) return;

    const panelId = `${activeWorkspace.id}-${panel.id}`;

    // Already popped out
    if (state.satellitePanels[panelId]) return;

    const windowLabel = `satellite-${panelId}`;
    const entry = PANEL_REGISTRY[panel.type];

    // Build satellite URL with query params
    const params = new URLSearchParams({
      satellite: 'true',
      panelId,
      panelType: panel.type,
      workspaceId: activeWorkspace.id,
    });

    // Pass ptyId for terminal reconnect
    const ptyId = (panel.settings as Record<string, unknown>)._ptyId as string | undefined;
    if (ptyId) {
      params.set('ptyId', ptyId);
    }

    const url = `index.html?${params.toString()}`;

    await openSatelliteWindow(windowLabel, url, entry.label);

    const info: SatelliteWindowInfo = {
      windowLabel,
      panelId,
      panelType: panel.type,
      slotIndex,
      workspaceId: activeWorkspace.id,
      ptyId,
    };

    dispatch({ type: 'SATELLITE_OPEN', panelId, info });
  }, [activeWorkspace, state.satellitePanels, dispatch]);

  const recall = useCallback(async (panelId: string) => {
    const info = state.satellitePanels[panelId];
    if (!info) return;

    // Emit recall event — satellite will self-close
    await emitRecallRequested(panelId);
    dispatch({ type: 'SATELLITE_CLOSE', panelId });
  }, [state.satellitePanels, dispatch]);

  const recallAll = useCallback(async () => {
    const panelIds = Object.keys(state.satellitePanels);
    for (const panelId of panelIds) {
      await recall(panelId);
    }
  }, [state.satellitePanels, recall]);

  const closeAllOnExit = useCallback(async () => {
    const labels = await getSatelliteWindows();
    for (const label of labels) {
      await closeSatelliteWindow(label);
    }
  }, []);

  return { popOut, recall, recallAll, closeAllOnExit };
}
