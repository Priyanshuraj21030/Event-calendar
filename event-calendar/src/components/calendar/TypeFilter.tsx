import React from 'react';
import { EventType, EVENT_TYPE_CONFIG } from '../../types/Event';

interface TypeFilterProps {
  selectedTypes: EventType[];
  onToggleType: (type: EventType) => void;
  typeCounts: Record<EventType, number>;
}

const TypeFilter: React.FC<TypeFilterProps> = ({
  selectedTypes,
  onToggleType,
  typeCounts,
}) => {
  return (
    <div className="flex flex-col space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Filter by Type</h3>
      <div className="flex flex-wrap gap-2">
        {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
          <button
            key={type}
            onClick={() => onToggleType(type as EventType)}
            className={`
              px-3 py-1.5 rounded-full text-sm flex items-center gap-2
              transition-colors duration-200
              ${selectedTypes.includes(type as EventType)
                ? 'bg-gray-200 text-gray-800'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-150'
              }
            `}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: config.color }}
            />
            <span>{config.label}</span>
            <span className="text-xs text-gray-500">({typeCounts[type as EventType] || 0})</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TypeFilter; 