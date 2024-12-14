import { CalendarEvent } from '../types/Event';

const STORAGE_KEY = 'calendar_events';

// IndexedDB setup
const DB_NAME = 'CalendarEventsDB';
const STORE_NAME = 'events';

// Initialize IndexedDB
const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Save events to all storage methods
export const saveEvents = async (events: CalendarEvent[]): Promise<void> => {
  try {
    // 1. Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));

    // 2. Save to IndexedDB
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Clear existing events
    await store.clear();
    
    // Add new events
    for (const event of events) {
      await store.add(event);
    }

    return new Promise((resolve) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => {
        console.error('IndexedDB save failed:', tx.error);
        resolve(); // Still resolve to allow partial saves
      };
    });
  } catch (error) {
    console.error('Error saving events:', error);
    throw error;
  }
};

// Load events from storage
export const loadEvents = async (): Promise<CalendarEvent[]> => {
  try {
    // Try IndexedDB first
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const events = await store.getAll();

    if (events.length > 0) {
      return events;
    }

    // Fallback to localStorage
    const storedEvents = localStorage.getItem(STORAGE_KEY);
    if (storedEvents) {
      const parsedEvents = JSON.parse(storedEvents);
      return parsedEvents.map((event: any) => ({
        ...event,
        startDate: new Date(event.startDate),
        endDate: new Date(event.endDate)
      }));
    }

    return [];
  } catch (error) {
    console.error('Error loading events:', error);
    return [];
  }
};

// Helper function to generate CSV content
const generateCSV = (events: CalendarEvent[]): string => {
  const headers = ['Date', 'Title', 'Start Time', 'End Time', 'Type', 'Description'];
  const rows = events.map(event => [
    event.startDate.toLocaleDateString(),
    event.title,
    event.startTime,
    event.endTime,
    event.type,
    event.description || ''
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');
};

// Helper function to download CSV
const downloadCSV = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Export CSV function for manual downloads
export const exportToCSV = (events: CalendarEvent[]): void => {
  const csvContent = generateCSV(events);
  downloadCSV(csvContent, `calendar-events-${new Date().toISOString().slice(0, 10)}.csv`);
};

// Verify storage function for debugging
export const verifyStorage = async (): Promise<void> => {
  const localEvents = localStorage.getItem(STORAGE_KEY);
  console.log('LocalStorage events:', localEvents ? JSON.parse(localEvents) : 'None');

  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const dbEvents = await store.getAll();
  console.log('IndexedDB events:', dbEvents);
};