import React from 'react';
import { DraggableProvidedDragHandleProps } from 'react-beautiful-dnd';

interface DragHandleProps {
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  disabled?: boolean;
}

const DragHandle: React.FC<DragHandleProps> = ({ dragHandleProps, disabled }) => {
  if (disabled) return null;

  return (
    <div
      {...dragHandleProps}
      className="
        absolute left-0 top-0 bottom-0 w-6
        flex items-center justify-center
        touch-none cursor-grab active:cursor-grabbing
        group-hover:opacity-100 opacity-0
        transition-opacity duration-200
      "
    >
      <div className="w-4 h-8 rounded-sm bg-white/10 flex flex-col justify-center gap-1 p-1">
        <div className="h-[2px] bg-white/60 rounded-full" />
        <div className="h-[2px] bg-white/60 rounded-full" />
        <div className="h-[2px] bg-white/60 rounded-full" />
      </div>
    </div>
  );
};

export default DragHandle; 