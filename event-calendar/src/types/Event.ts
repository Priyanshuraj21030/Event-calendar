export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  type: EventType;
  isMultiDay?: boolean;
}

export type EventType = 'work' | 'personal' | 'meeting' | 'other';

export type EventMode = 'view' | 'edit' | 'create';

export const EVENT_TYPE_CONFIG = {
  work: {
    color: '#3b82f6',  // blue
    label: 'Work'
  },
  personal: {
    color: '#10b981',  // green
    label: 'Personal'
  },
  meeting: {
    color: '#8b5cf6',  // purple
    label: 'Meeting'
  },
  other: {
    color: '#f59e0b',  // amber
    label: 'Other'
  }
} as const;