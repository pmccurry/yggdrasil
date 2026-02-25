import { useState, useCallback } from 'react';

interface DragHandleProps {
  orientation: 'vertical' | 'horizontal';
  onDragStart: () => void;
  onDrag: (delta: number) => void;
  onDragEnd: () => void;
}

function DragHandle({ orientation, onDragStart, onDrag, onDragEnd }: DragHandleProps) {
  const [hovering, setHovering] = useState(false);
  const [dragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    onDragStart();

    const startPos = orientation === 'vertical' ? e.clientX : e.clientY;

    function handleMouseMove(me: MouseEvent) {
      const currentPos = orientation === 'vertical' ? me.clientX : me.clientY;
      const delta = currentPos - startPos;
      onDrag(delta);
    }

    function handleMouseUp() {
      setDragging(false);
      onDragEnd();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [orientation, onDragStart, onDrag, onDragEnd]);

  const isVertical = orientation === 'vertical';
  const visible = hovering || dragging;

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onMouseDown={handleMouseDown}
      style={{
        position: 'relative',
        width: isVertical ? 'var(--drag-handle-size)' : '100%',
        height: isVertical ? '100%' : 'var(--drag-handle-size)',
        cursor: isVertical ? 'col-resize' : 'row-resize',
        zIndex: 5,
        flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: 'var(--accent-border)',
        opacity: visible ? 1 : 0,
        transition: 'opacity 0.15s',
      }} />
    </div>
  );
}

export default DragHandle;
