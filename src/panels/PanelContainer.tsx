import { Suspense, lazy } from 'react';
import type { PanelProps } from '../types/panels';
import PanelSkeleton from './PanelSkeleton';

const TerminalPanel = lazy(() => import('./terminal/TerminalPanel'));

interface PanelContainerProps {
  panelProps: PanelProps;
}

function PanelContainer({ panelProps }: PanelContainerProps) {
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <Suspense fallback={<PanelSkeleton />}>
        <TerminalPanel {...panelProps} />
      </Suspense>
    </div>
  );
}

export default PanelContainer;
