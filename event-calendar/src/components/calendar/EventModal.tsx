import { useState, useEffect } from 'react';
import { CalendarEvent, EventMode, EVENT_TYPE_CONFIG, EventType } from '../../types/Event';
import TimeInput from './TimeInput';
import { findOverlappingEvent, validateTimeRange, formatTime12Hour } from '../../utils/dateTime';
import { typography, spacing } from '../../styles/typography';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: Omit<CalendarEvent, 'id'>) => void;
  onDelete?: (eventId: string) => void;
  onUpdate?: (event: CalendarEvent) => void;
  selectedDate: Date;
  selectedEvent?: CalendarEvent;
  mode: EventMode;
  eventsForDay: CalendarEvent[];
  searchQuery?: string;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onUpdate,
  selectedDate,
  selectedEvent,
  mode,
  eventsForDay,
  searchQuery = '',
}) => {
  const [eventData, setEventData] = useState({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    description: '',
    type: 'other' as EventType
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [modalMode, setModalMode] = useState<EventMode>('view');

  useEffect(() => {
    if (selectedEvent && (mode === 'edit' || mode === 'view')) {
      setEventData({
        title: selectedEvent.title,
        startTime: selectedEvent.startTime,
        endTime: selectedEvent.endTime,
        description: selectedEvent.description || '',
        type: selectedEvent.type
      });
    } else {
      setEventData({
        title: '',
        startTime: '09:00',
        endTime: '10:00',
        description: '',
        type: 'other'
      });
    }
  }, [selectedEvent, mode]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!eventData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    const timeRangeError = validateTimeRange(eventData.startTime, eventData.endTime);
    if (timeRangeError) {
      newErrors.endTime = timeRangeError;
    }

    // Check for overlapping events
    const overlappingEvent = findOverlappingEvent(
      {
        ...eventData,
        date: selectedDate,
      },
      eventsForDay,
      selectedEvent?.id // Exclude current event when editing
    );

    if (overlappingEvent) {
      newErrors.time = `Overlaps with "${overlappingEvent.title}" (${
        formatTime12Hour(overlappingEvent.startTime)
      } - ${
        formatTime12Hour(overlappingEvent.endTime)
      })`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const convertTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const newEventData = {
      title: eventData.title,
      description: eventData.description,
      startTime: eventData.startTime,
      endTime: eventData.endTime,
      type: eventData.type as EventType,
      startDate: selectedDate,
      endDate: selectedDate
    };

    if (mode === 'edit' && selectedEvent && onUpdate) {
      onUpdate({
        ...selectedEvent,
        ...newEventData,
      });
    } else {
      onSave(newEventData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (selectedEvent && onDelete) {
      onDelete(selectedEvent.id);
      onClose();
    }
  };

  const formatEventTime = (event: CalendarEvent) => {
    const formatTime12Hour = (time24: string): string => {
      const [hours, minutes] = time24.split(':');
      const hoursNum = parseInt(hours);
      const period = hoursNum >= 12 ? 'PM' : 'AM';
      const hours12 = hoursNum === 0 ? 12 : hoursNum > 12 ? hoursNum - 12 : hoursNum;
      return `${hours12}:${minutes}${period}`;
    };

    return `${formatTime12Hour(event.startTime)} - ${formatTime12Hour(event.endTime)}`;
  };

  const handleEventClick = (clickedEvent: CalendarEvent) => {
    setEventData({
      title: clickedEvent.title,
      startTime: clickedEvent.startTime,
      endTime: clickedEvent.endTime,
      description: clickedEvent.description || '',
      type: clickedEvent.type
    });
    if (onUpdate) {
      setModalMode('edit');
    }
  };

  // Helper function to highlight search matches
  const highlightText = (text: string, query: string) => {
    if (!query.trim()) {
      return text;
    }

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <span>
        {parts.map((part, i) => 
          part.toLowerCase() === query.toLowerCase() ? (
            <span key={i} className="bg-yellow-200">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`bg-white rounded-lg ${spacing.container} w-full max-w-md max-h-[90vh] flex flex-col`}>
        <h2 className={`${typography.h3} mb-4`}>
          {mode === 'view' ? 'Event Details' : mode === 'edit' ? 'Edit Event' : 'Add Event'} 
          for {selectedDate.toLocaleDateString()}
        </h2>
        
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className={spacing.stack}>
            <div className={spacing.stack}>
              <label className={`block ${typography.small} font-medium text-gray-700`}>
                Event Name
              </label>
              <input
                type="text"
                required
                disabled={mode === 'view'}
                className={`w-full px-3 py-2 border rounded-md ${
                  errors.title ? 'border-red-500' : ''
                } ${mode === 'view' ? 'bg-gray-100' : ''}`}
                value={eventData.title}
                onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
              />
              {errors.title && (
                <p className="text-red-500 text-sm mt-1">{errors.title}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <TimeInput
                  value={eventData.startTime}
                  onChange={(time) => setEventData({ ...eventData, startTime: time })}
                  disabled={mode === 'view'}
                  error={!!errors.startTime}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <TimeInput
                  value={eventData.endTime}
                  onChange={(time) => setEventData({ ...eventData, endTime: time })}
                  disabled={mode === 'view'}
                  error={!!errors.endTime}
                />
                {errors.endTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.endTime}</p>
                )}
              </div>
            </div>

            {mode !== 'view' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Event Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEventData({ ...eventData, type: type as EventType })}
                      className={`
                        p-2 rounded-md border transition-all
                        flex items-center gap-2
                        ${eventData.type === type 
                          ? 'border-2 border-primary shadow-sm' 
                          : 'border-gray-200 hover:border-gray-300'
                        }
                      `}
                    >
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: config.color }}
                      />
                      <span className="text-sm">{config.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                className={`w-full px-3 py-2 border rounded-md ${
                  mode === 'view' ? 'bg-gray-100' : ''
                }`}
                rows={3}
                disabled={mode === 'view'}
                value={eventData.description}
                onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
              />
            </div>

            {/* Add error message for overlapping events */}
            {errors.time && (
              <div className="rounded-md bg-destructive/15 p-3">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-destructive" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-destructive">
                      Time Conflict
                    </h3>
                    <div className="mt-1 text-sm text-destructive">
                      {errors.time}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </form>

          {/* Updated Events list section */}
          <div className={`border-t pt-4 ${spacing.stack}`}>
            <h3 className={typography.h4}>
              Events on {selectedDate.toLocaleDateString()}
            </h3>
            {eventsForDay.length === 0 ? (
              <p className="text-gray-500 italic">No events scheduled for this day.</p>
            ) : (
              <div className="space-y-2">
                {eventsForDay
                  .sort((a, b) => a.startTime.localeCompare(b.startTime))
                  .map(event => (
                    <div
                      key={event.id}
                      className={`
                        flex items-center p-3 rounded-md hover:bg-gray-50 border
                        ${event.id === selectedEvent?.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}
                      `}
                    >
                      <div
                        className="w-3 h-3 rounded-full mr-3 flex-shrink-0"
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm truncate">
                          {highlightText(event.title, searchQuery)}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatEventTime(event)}
                        </p>
                        {event.description && (
                          <p className="text-xs text-gray-600 truncate mt-1">
                            {highlightText(event.description, searchQuery)}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <button
                          type="button"
                          onClick={() => handleEventClick(event)}
                          className="p-1 text-gray-600 hover:text-blue-600 rounded"
                          title="Edit event"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (onDelete && window.confirm('Are you sure you want to delete this event?')) {
                              onDelete(event.id);
                            }
                          }}
                          className="p-1 text-gray-600 hover:text-red-600 rounded"
                          title="Delete event"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* Move action buttons outside the scrollable area */}
        <div className="border-t mt-4 pt-4 flex justify-end space-x-2">
          {mode === 'view' ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Close
              </button>
              {onUpdate && (
                <button
                  type="button"
                  onClick={() => onUpdate(selectedEvent!)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Edit
                </button>
              )}
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md"
              >
                Cancel
              </button>
              {mode === 'edit' && onDelete && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
                >
                  Delete
                </button>
              )}
              <button
                type="submit"
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                {mode === 'edit' ? 'Update' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventModal; 