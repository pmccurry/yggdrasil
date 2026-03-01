import { useRef, Fragment, type ReactNode } from 'react';
import { useWorkspaceContext } from '../store/WorkspaceContext';
import { useAppContext } from '../store/AppContext';
import { useSatellitePanel } from '../hooks/useSatellitePanel';
import PanelContainer from '../panels/PanelContainer';
import DragHandle from './DragHandle';
import PanelAddButton from './PanelAddButton';
import { useVerticalDrag, useHorizontalDrag } from '../hooks/useLayoutDrag';
import type { PanelSettings } from '../types/panels';
import type { SatelliteWindowInfo } from '../types/panels';
import type { PanelSlot, Workspace } from '../types/workspace';

// Panel slot enriched with its global index in the panels array
interface IndexedPanel extends PanelSlot {
  globalIndex: number;
}

// ─── LayoutGrid ──────────────────────────────────────────────────────────────

function LayoutGrid() {
  const { activeWorkspace, state, dispatch } = useWorkspaceContext();
  const { state: appState } = useAppContext();
  const { popOut, recall } = useSatellitePanel();

  if (!activeWorkspace) {
    return (
      <div style={{
        width: '100%', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'var(--bg-base)',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--font-size-md)',
      }}>
        No workspace selected
      </div>
    );
  }

  const { panels, preset, rowWeight } = activeWorkspace.layout;
  const indexed: IndexedPanel[] = panels.map((p, i) => ({ ...p, globalIndex: i }));
  const row0 = indexed.filter(p => p.row === 0);
  const row1 = indexed.filter(p => p.row === 1);
  const hasRow1 = row1.length > 0;
  const showAddButton = panels.length < 4;
  const isSpanning = preset === 'large-two-stacked' && hasRow1;

  // Single row: all panels side by side
  if (!hasRow1) {
    return (
      <PanelRow
        rowPanels={row0}
        allPanels={panels}
        workspace={activeWorkspace}
        dispatch={dispatch}
        focusedIndex={appState.focusedPanelIndex}
        satellitePanels={state.satellitePanels}
        onPopOut={popOut}
        onRecall={recall}
        style={{ width: '100%', height: '100%' }}
      >
        {showAddButton && (
          <PanelAddButton onAddPanel={(type) => dispatch({ type: 'ADD_PANEL', panelType: type })} />
        )}
      </PanelRow>
    );
  }

  // Spanning layout (large-two-stacked): panel A spans full height on left
  if (isSpanning) {
    return (
      <SpanningLayout
        panels={panels}
        row0={row0}
        row1={row1}
        rowWeight={rowWeight}
        workspace={activeWorkspace}
        dispatch={dispatch}
        focusedIndex={appState.focusedPanelIndex}
        showAddButton={showAddButton}
        satellitePanels={state.satellitePanels}
        onPopOut={popOut}
        onRecall={recall}
      />
    );
  }

  // Two-row layout: each row has independent column sizing
  return (
    <TwoRowLayout
      panels={panels}
      row0={row0}
      row1={row1}
      rowWeight={rowWeight}
      workspace={activeWorkspace}
      dispatch={dispatch}
      focusedIndex={appState.focusedPanelIndex}
      showAddButton={showAddButton}
      satellitePanels={state.satellitePanels}
      onPopOut={popOut}
      onRecall={recall}
    />
  );
}

// ─── PanelRow ──────────────────────────────────────────────────────────────────
// Renders panels horizontally with vertical drag handles between them.
// Each row manages its own ref so drag handles only affect panels within this row.

function PanelRow({
  rowPanels,
  allPanels,
  workspace,
  dispatch,
  focusedIndex,
  satellitePanels,
  onPopOut,
  onRecall,
  flex,
  style,
  children,
}: {
  rowPanels: IndexedPanel[];
  allPanels: PanelSlot[];
  workspace: Workspace;
  dispatch: React.Dispatch<
    | { type: 'UPDATE_PANEL_SETTINGS'; slotIndex: number; settings: PanelSettings }
    | { type: 'UPDATE_PANEL_TYPE'; slotIndex: number; panelType: import('../types/panels').PanelType }
    | { type: 'REMOVE_PANEL'; slotIndex: number }
    | { type: 'UPDATE_PANEL_SIZE_WEIGHT'; slotIndex: number; sizeWeight: number }
  >;
  focusedIndex: number | null;
  satellitePanels: Record<string, SatelliteWindowInfo>;
  onPopOut: (slotIndex: number) => void;
  onRecall: (panelId: string) => void;
  flex?: number;
  style?: React.CSSProperties;
  children?: ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const totalWeight = rowPanels.reduce((sum, p) => sum + p.sizeWeight, 0);

  return (
    <div
      ref={rowRef}
      style={{
        display: 'flex',
        flex: flex ?? 1,
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
        ...style,
      }}
    >
      {rowPanels.map((panel, i) => {
        const panelId = `${workspace.id}-${panel.id}`;
        const isSat = !!satellitePanels[panelId];
        return (
          <Fragment key={`${workspace.id}-${panel.id}`}>
            {i > 0 && (
              <VerticalDragBetween
                containerRef={rowRef}
                leftIndex={rowPanels[i - 1].globalIndex}
                rightIndex={panel.globalIndex}
                panels={allPanels}
                totalWeight={totalWeight}
                dispatch={dispatch}
              />
            )}
            <div style={{ flex: panel.sizeWeight, overflow: 'hidden', display: 'flex' }}>
              <PanelContainer
                panelType={panel.type}
                isFocused={focusedIndex === panel.globalIndex}
                canRemove={allPanels.length > 1}
                onRemovePanel={() => dispatch({ type: 'REMOVE_PANEL', slotIndex: panel.globalIndex })}
                isSatellite={isSat}
                onPopOut={() => onPopOut(panel.globalIndex)}
                onRecall={() => onRecall(panelId)}
                panelProps={{
                  panelId,
                  settings: panel.settings,
                  projectRoot: workspace.projectRoot,
                  accentColor: workspace.accentColor,
                  onSettingsChange: (settings: PanelSettings) => {
                    dispatch({ type: 'UPDATE_PANEL_SETTINGS', slotIndex: panel.globalIndex, settings });
                  },
                }}
                onSwapPanel={(newType) => {
                  dispatch({ type: 'UPDATE_PANEL_TYPE', slotIndex: panel.globalIndex, panelType: newType });
                }}
              />
            </div>
          </Fragment>
        );
      })}
      {children}
    </div>
  );
}

// ─── TwoRowLayout ──────────────────────────────────────────────────────────────
// Two rows stacked vertically, each with independent column sizing.
// Row 0's vertical drag handles don't affect row 1's columns, and vice versa.

function TwoRowLayout({
  panels,
  row0,
  row1,
  rowWeight,
  workspace,
  dispatch,
  focusedIndex,
  showAddButton,
  satellitePanels,
  onPopOut,
  onRecall,
}: {
  panels: PanelSlot[];
  row0: IndexedPanel[];
  row1: IndexedPanel[];
  rowWeight: number;
  workspace: Workspace;
  dispatch: React.Dispatch<any>;
  focusedIndex: number | null;
  showAddButton: boolean;
  satellitePanels: Record<string, SatelliteWindowInfo>;
  onPopOut: (slotIndex: number) => void;
  onRecall: (panelId: string) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={outerRef}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      <PanelRow
        rowPanels={row0}
        allPanels={panels}
        workspace={workspace}
        dispatch={dispatch}
        focusedIndex={focusedIndex}
        satellitePanels={satellitePanels}
        onPopOut={onPopOut}
        onRecall={onRecall}
        flex={rowWeight}
      />
      <HorizontalDragBetween
        containerRef={outerRef}
        currentRowWeight={rowWeight}
        dispatch={dispatch}
      />
      <PanelRow
        rowPanels={row1}
        allPanels={panels}
        workspace={workspace}
        dispatch={dispatch}
        focusedIndex={focusedIndex}
        satellitePanels={satellitePanels}
        onPopOut={onPopOut}
        onRecall={onRecall}
        flex={1}
      >
        {showAddButton && (
          <PanelAddButton onAddPanel={(type) => dispatch({ type: 'ADD_PANEL', panelType: type })} />
        )}
      </PanelRow>
    </div>
  );
}

// ─── SpanningLayout ────────────────────────────────────────────────────────────
// Panel A spans full height on the left. Right column stacks B and C vertically.
// Vertical drag between A and the right column. Horizontal drag between B and C.

function SpanningLayout({
  panels,
  row0,
  row1,
  rowWeight,
  workspace,
  dispatch,
  focusedIndex,
  showAddButton,
  satellitePanels,
  onPopOut,
  onRecall,
}: {
  panels: PanelSlot[];
  row0: IndexedPanel[];
  row1: IndexedPanel[];
  rowWeight: number;
  workspace: Workspace;
  dispatch: React.Dispatch<any>;
  focusedIndex: number | null;
  showAddButton: boolean;
  satellitePanels: Record<string, SatelliteWindowInfo>;
  onPopOut: (slotIndex: number) => void;
  onRecall: (panelId: string) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const rightColRef = useRef<HTMLDivElement>(null);

  const spanningPanel = row0[0];
  const rightTopPanels = row0.slice(1);
  const rightBottomPanels = row1;

  // The right column's flex weight is determined by the first non-spanning row-0 panel
  const rightColumnWeight = rightTopPanels.length > 0
    ? rightTopPanels[0].sizeWeight
    : rightBottomPanels[0]?.sizeWeight ?? 1;

  // For the vertical drag: total weight is spanning panel + right column
  const totalOuterWeight = spanningPanel.sizeWeight + rightColumnWeight;
  const rightRepIndex = rightTopPanels.length > 0
    ? rightTopPanels[0].globalIndex
    : rightBottomPanels[0]?.globalIndex ?? 0;

  const spanningPanelId = `${workspace.id}-${spanningPanel.id}`;
  const isSpanningSat = !!satellitePanels[spanningPanelId];

  return (
    <div
      ref={outerRef}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: 'var(--bg-base)',
      }}
    >
      {/* Spanning panel (left, full height) */}
      <div style={{ flex: spanningPanel.sizeWeight, overflow: 'hidden', display: 'flex' }}>
        <PanelContainer
          panelType={spanningPanel.type}
          isFocused={focusedIndex === spanningPanel.globalIndex}
          canRemove={panels.length > 1}
          onRemovePanel={() => dispatch({ type: 'REMOVE_PANEL', slotIndex: spanningPanel.globalIndex })}
          isSatellite={isSpanningSat}
          onPopOut={() => onPopOut(spanningPanel.globalIndex)}
          onRecall={() => onRecall(spanningPanelId)}
          panelProps={{
            panelId: spanningPanelId,
            settings: spanningPanel.settings,
            projectRoot: workspace.projectRoot,
            accentColor: workspace.accentColor,
            onSettingsChange: (settings: PanelSettings) => {
              dispatch({ type: 'UPDATE_PANEL_SETTINGS', slotIndex: spanningPanel.globalIndex, settings });
            },
          }}
          onSwapPanel={(newType) => {
            dispatch({ type: 'UPDATE_PANEL_TYPE', slotIndex: spanningPanel.globalIndex, panelType: newType });
          }}
        />
      </div>

      {/* Vertical drag between spanning panel and right column */}
      <VerticalDragBetween
        containerRef={outerRef}
        leftIndex={spanningPanel.globalIndex}
        rightIndex={rightRepIndex}
        panels={panels}
        totalWeight={totalOuterWeight}
        dispatch={dispatch}
      />

      {/* Right column: stacked panels */}
      <div
        ref={rightColRef}
        style={{
          flex: rightColumnWeight,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {rightTopPanels.map((panel) => {
          const pid = `${workspace.id}-${panel.id}`;
          const isSat = !!satellitePanels[pid];
          return (
            <div key={`${workspace.id}-${panel.id}`} style={{ flex: rowWeight, overflow: 'hidden', display: 'flex' }}>
              <PanelContainer
                panelType={panel.type}
                isFocused={focusedIndex === panel.globalIndex}
                canRemove={panels.length > 1}
                onRemovePanel={() => dispatch({ type: 'REMOVE_PANEL', slotIndex: panel.globalIndex })}
                isSatellite={isSat}
                onPopOut={() => onPopOut(panel.globalIndex)}
                onRecall={() => onRecall(pid)}
                panelProps={{
                  panelId: pid,
                  settings: panel.settings,
                  projectRoot: workspace.projectRoot,
                  accentColor: workspace.accentColor,
                  onSettingsChange: (settings: PanelSettings) => {
                    dispatch({ type: 'UPDATE_PANEL_SETTINGS', slotIndex: panel.globalIndex, settings });
                  },
                }}
                onSwapPanel={(newType) => {
                  dispatch({ type: 'UPDATE_PANEL_TYPE', slotIndex: panel.globalIndex, panelType: newType });
                }}
              />
            </div>
          );
        })}

        {rightTopPanels.length > 0 && rightBottomPanels.length > 0 && (
          <HorizontalDragBetween
            containerRef={rightColRef}
            currentRowWeight={rowWeight}
            dispatch={dispatch}
          />
        )}

        {rightBottomPanels.map((panel) => {
          const pid = `${workspace.id}-${panel.id}`;
          const isSat = !!satellitePanels[pid];
          return (
            <div key={`${workspace.id}-${panel.id}`} style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
              <PanelContainer
                panelType={panel.type}
                isFocused={focusedIndex === panel.globalIndex}
                canRemove={panels.length > 1}
                onRemovePanel={() => dispatch({ type: 'REMOVE_PANEL', slotIndex: panel.globalIndex })}
                isSatellite={isSat}
                onPopOut={() => onPopOut(panel.globalIndex)}
                onRecall={() => onRecall(pid)}
                panelProps={{
                  panelId: pid,
                  settings: panel.settings,
                  projectRoot: workspace.projectRoot,
                  accentColor: workspace.accentColor,
                  onSettingsChange: (settings: PanelSettings) => {
                    dispatch({ type: 'UPDATE_PANEL_SETTINGS', slotIndex: panel.globalIndex, settings });
                  },
                }}
                onSwapPanel={(newType) => {
                  dispatch({ type: 'UPDATE_PANEL_TYPE', slotIndex: panel.globalIndex, panelType: newType });
                }}
              />
            </div>
          );
        })}
      </div>

      {showAddButton && (
        <PanelAddButton onAddPanel={(type) => dispatch({ type: 'ADD_PANEL', panelType: type })} />
      )}
    </div>
  );
}

// ─── Drag Handle Wrappers ────────────────────────────────────────────────────

function VerticalDragBetween({
  containerRef,
  leftIndex,
  rightIndex,
  panels,
  totalWeight,
  dispatch,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  leftIndex: number;
  rightIndex: number;
  panels: PanelSlot[];
  totalWeight: number;
  dispatch: React.Dispatch<{ type: 'UPDATE_PANEL_SIZE_WEIGHT'; slotIndex: number; sizeWeight: number }>;
}) {
  const { onDragStart, onDrag, onDragEnd } = useVerticalDrag({
    containerRef,
    leftIndex,
    rightIndex,
    panels,
    totalWeight,
    dispatch,
  });

  return (
    <DragHandle
      orientation="vertical"
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
    />
  );
}

function HorizontalDragBetween({
  containerRef,
  currentRowWeight,
  dispatch,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentRowWeight: number;
  dispatch: React.Dispatch<{ type: 'UPDATE_ROW_WEIGHT'; rowWeight: number }>;
}) {
  const { onDragStart, onDrag, onDragEnd } = useHorizontalDrag({
    containerRef,
    currentRowWeight,
    dispatch,
  });

  return (
    <DragHandle
      orientation="horizontal"
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
    />
  );
}

export default LayoutGrid;
