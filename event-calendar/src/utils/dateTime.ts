import { CalendarEvent } from "../types/Event";

// Convert time string to minutes for easier comparison
export const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Check if two time ranges overlap
export const doTimesOverlap = (
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean => {
  const start1Mins = timeToMinutes(start1);
  const end1Mins = timeToMinutes(end1);
  const start2Mins = timeToMinutes(start2);
  const end2Mins = timeToMinutes(end2);

  return start1Mins < end2Mins && end1Mins > start2Mins;
};

// Check if an event overlaps with any existing events
export const findOverlappingEvent = (
  newEvent: Omit<CalendarEvent, 'id'>,
  existingEvents: CalendarEvent[],
  excludeEventId?: string
): CalendarEvent | undefined => {
  const isSameDate = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  return existingEvents.find(existingEvent => {
    // Skip the event being edited
    if (excludeEventId && existingEvent.id === excludeEventId) {
      return false;
    }

    // Check if events are on the same day
    if (!isSameDate(new Date(existingEvent.date), new Date(newEvent.date))) {
      return false;
    }

    // Check if times overlap
    return doTimesOverlap(
      newEvent.startTime,
      newEvent.endTime,
      existingEvent.startTime,
      existingEvent.endTime
    );
  });
};

// Format time for display
export const formatTime12Hour = (time24: string): string => {
  const [hours, minutes] = time24.split(':');
  const hoursNum = parseInt(hours);
  const period = hoursNum >= 12 ? 'PM' : 'AM';
  const hours12 = hoursNum === 0 ? 12 : hoursNum > 12 ? hoursNum - 12 : hoursNum;
  return `${hours12}:${minutes}${period}`;
};

// Validate time range
export const validateTimeRange = (startTime: string, endTime: string): string | null => {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = timeToMinutes(endTime);
  
  if (endMinutes <= startMinutes) {
    return 'End time must be after start time';
  }
  
  return null;
}; 