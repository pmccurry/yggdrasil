import { useCallback, useRef } from 'react';

const MIN_SIZE_WEIGHT = 0.2;

interface UseVerticalDragArgs {
  containerRef: React.RefObject<HTMLDivElement | null>;
  leftIndex: number;
  rightIndex: number;
  panels: { sizeWeight: number }[];
  totalWeight: number;
  dispatch: React.Dispatch<{ type: 'UPDATE_PANEL_SIZE_WEIGHT'; slotIndex: number; sizeWeight: number }>;
}

export function useVerticalDrag({ containerRef, leftIndex, rightIndex, panels, totalWeight, dispatch }: UseVerticalDragArgs) {
  const initialWeights = useRef<{ left: number; right: number }>({ left: 1, right: 1 });
  const initialTotalWeight = useRef(0);

  const onDragStart = useCallback(() => {
    initialWeights.current = {
      left: panels[leftIndex].sizeWeight,
      right: panels[rightIndex].sizeWeight,
    };
    initialTotalWeight.current = totalWeight;
    window.dispatchEvent(new CustomEvent('yggdrasil:drag-start'));
  }, [panels, leftIndex, rightIndex, totalWeight]);

  const onDrag = useCallback((delta: number) => {
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.getBoundingClientRect().width;
    const tw = initialTotalWeight.current;

    // Convert pixel delta to weight delta
    const weightDelta = (delta / containerWidth) * tw;

    let newLeft = initialWeights.current.left + weightDelta;
    let newRight = initialWeights.current.right - weightDelta;

    // Clamp
    if (newLeft < MIN_SIZE_WEIGHT) {
      newRight += (newLeft - MIN_SIZE_WEIGHT);
      newLeft = MIN_SIZE_WEIGHT;
    }
    if (newRight < MIN_SIZE_WEIGHT) {
      newLeft += (newRight - MIN_SIZE_WEIGHT);
      newRight = MIN_SIZE_WEIGHT;
    }

    dispatch({ type: 'UPDATE_PANEL_SIZE_WEIGHT', slotIndex: leftIndex, sizeWeight: Math.max(newLeft, MIN_SIZE_WEIGHT) });
    dispatch({ type: 'UPDATE_PANEL_SIZE_WEIGHT', slotIndex: rightIndex, sizeWeight: Math.max(newRight, MIN_SIZE_WEIGHT) });
  }, [containerRef, leftIndex, rightIndex, dispatch]);

  const onDragEnd = useCallback(() => {
    window.dispatchEvent(new CustomEvent('yggdrasil:drag-end'));
  }, []);

  return { onDragStart, onDrag, onDragEnd };
}

interface UseHorizontalDragArgs {
  containerRef: React.RefObject<HTMLDivElement | null>;
  currentRowWeight: number;
  dispatch: React.Dispatch<{ type: 'UPDATE_ROW_WEIGHT'; rowWeight: number }>;
}

export function useHorizontalDrag({ containerRef, currentRowWeight, dispatch }: UseHorizontalDragArgs) {
  const initialRowWeight = useRef(1);

  const onDragStart = useCallback(() => {
    initialRowWeight.current = currentRowWeight;
    window.dispatchEvent(new CustomEvent('yggdrasil:drag-start'));
  }, [currentRowWeight]);

  const onDrag = useCallback((delta: number) => {
    const container = containerRef.current;
    if (!container) return;

    const containerHeight = container.getBoundingClientRect().height;
    // rowWeight controls ratio: top = rowWeight * fr, bottom = 1fr
    // Moving down (positive delta) increases top relative to bottom → increase rowWeight
    const totalWeight = initialRowWeight.current + 1;
    const weightDelta = (delta / containerHeight) * totalWeight;

    let newRowWeight = initialRowWeight.current + weightDelta;
    newRowWeight = Math.max(MIN_SIZE_WEIGHT, Math.min(newRowWeight, 5));

    dispatch({ type: 'UPDATE_ROW_WEIGHT', rowWeight: newRowWeight });
  }, [containerRef, dispatch]);

  const onDragEnd = useCallback(() => {
    window.dispatchEvent(new CustomEvent('yggdrasil:drag-end'));
  }, []);

  return { onDragStart, onDrag, onDragEnd };
}
