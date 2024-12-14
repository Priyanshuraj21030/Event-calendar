import React, { useCallback } from 'react';

interface ResizeHandleProps {
  position: 'start' | 'end';
  onResize: (direction: number) => void;
  disabled?: boolean;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ position, onResize, disabled }) => {
  if (disabled) return null;

  const handleStart = useCallback((clientX: number) => {
    const startX = clientX;
    
    const handleMove = (moveX: number) => {
      const diff = moveX - startX;
      onResize(position === 'start' ? -diff : diff);
    };
    
    return handleMove;
  }, [position, onResize]);

  return (
    <div
      className={`
        absolute top-0 bottom-0 w-6 cursor-col-resize
        hover:bg-white/20 group touch-none
        ${position === 'start' ? 'left-0' : 'right-0'}
      `}
      onMouseDown={(e) => {
        e.stopPropagation();
        const handleMove = handleStart(e.clientX);
        
        const handleMouseMove = (moveEvent: MouseEvent) => {
          handleMove(moveEvent.clientX);
        };
        
        const handleMouseUp = () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
        
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
      }}
      onTouchStart={(e) => {
        e.stopPropagation();
        const touch = e.touches[0];
        const handleMove = handleStart(touch.clientX);
        
        const handleTouchMove = (moveEvent: TouchEvent) => {
          handleMove(moveEvent.touches[0].clientX);
        };
        
        const handleTouchEnd = () => {
          document.removeEventListener('touchmove', handleTouchMove);
          document.removeEventListener('touchend', handleTouchEnd);
        };
        
        document.addEventListener('touchmove', handleTouchMove, { passive: false });
        document.addEventListener('touchend', handleTouchEnd);
      }}
    >
      <div className="
        hidden group-hover:block absolute top-1/2 -translate-y-1/2
        w-1.5 h-8 bg-white/60 rounded-full mx-auto
      " />
    </div>
  );
};

export default ResizeHandle; 