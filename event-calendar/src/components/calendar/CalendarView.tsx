import { useState, useMemo, useCallback, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import EventModal from "./EventModal";
import SearchBar from "./SearchBar";
import {
  CalendarEvent,
  EventMode,
  EVENT_TYPE_CONFIG,
  EventType,
} from "../../types/Event";
import { motion, AnimatePresence } from "framer-motion";
import ResizeHandle from "./ResizeHandle";
import DragHandle from "./DragHandle";
import TypeFilter from "./TypeFilter";
import { typography, spacing } from "../../styles/typography";
import { saveEvents, loadEvents, exportToCSV } from "../../utils/storage";

interface CalendarViewProps {
  // Add props if needed in the future
}

interface HistoryState {
  past: CalendarEvent[][];
  present: CalendarEvent[];
  future: CalendarEvent[][];
}

const CalendarView: React.FC<CalendarViewProps> = () => {
  const weekDays = [
    { short: "Sun", long: "Sunday", isWeekend: true },
    { short: "Mon", long: "Monday", isWeekend: false },
    { short: "Tue", long: "Tuesday", isWeekend: false },
    { short: "Wed", long: "Wednesday", isWeekend: false },
    { short: "Thu", long: "Thursday", isWeekend: false },
    { short: "Fri", long: "Friday", isWeekend: false },
    { short: "Sat", long: "Saturday", isWeekend: true },
  ];

  const [currentDate, setCurrentDate] = useState(new Date());
  const [history, setHistory] = useState<HistoryState>(() => ({
    past: [],
    present: [],
    future: [],
  }));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEvent, setSelectedEvent] = useState<
    CalendarEvent | undefined
  >();
  const [modalMode, setModalMode] = useState<EventMode>("create");
  const [searchQuery, setSearchQuery] = useState("");
  const [dragError, setDragError] = useState<string | null>(null);
  const [resizingEvent, setResizingEvent] = useState<{
    id: string;
    startDate: Date;
    endDate: Date;
  } | null>(null);
  const [selectedTypes, setSelectedTypes] = useState<EventType[]>(
    Object.keys(EVENT_TYPE_CONFIG) as EventType[]
  );
  const [showSaveNotification, setShowSaveNotification] = useState(false);

  // Helper functions for calendar logic
  const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Navigation handlers
  const handlePreviousMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
    );
  };

  const handleNextMonth = () => {
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
    );
  };

  const handleDayClick = (day: number) => {
    setSelectedEvent(undefined);
    setModalMode("create");
    const clickedDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    clickedDate.setHours(0, 0, 0, 0);
    setSelectedDate(clickedDate);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setSelectedDate(event.startDate);
    setModalMode("view");
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    try {
      const newEvent: CalendarEvent = {
        ...eventData,
        id: Date.now().toString(),
        startDate: selectedDate,
        endDate: selectedDate,
        title: eventData.title.trim(),
        description: eventData.description?.trim() || "",
        type: eventData.type || "other",
        startTime: convertTo24Hour(eventData.startTime),
        endTime: convertTo24Hour(eventData.endTime),
        isMultiDay: false,
      };

      const newPresent = [...history.present, newEvent];

      // Save to storage
      await saveEvents(newPresent);

      // Update state
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newPresent,
        future: [],
      }));

      // Export to CSV after saving
      exportToCSV(newPresent);

      // Show success notification
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 2000);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving event:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  const handleDeleteEvent = (eventId: string) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: prev.present.filter((event) => event.id !== eventId),
      future: [],
    }));
  };

  const handleUpdateEvent = async (updatedEvent: CalendarEvent) => {
    try {
      const newPresent = history.present.map((event) =>
        event.id === updatedEvent.id ? updatedEvent : event
      );

      // Save to storage
      await saveEvents(newPresent);

      // Update state
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newPresent,
        future: [],
      }));

      // Export to CSV after updating
      exportToCSV(newPresent);

      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 2000);
      setModalMode("view");
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Failed to update event. Please try again.");
    }
  };

  // Filter events based on search query
  const filteredEvents = useMemo(() => {
    let filtered = history.present;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((event) => {
        const titleMatch = event.title.toLowerCase().includes(query);
        const descriptionMatch = event.description
          ?.toLowerCase()
          .includes(query);
        return titleMatch || descriptionMatch;
      });
    }

    // Filter by selected types
    filtered = filtered.filter((event) => selectedTypes.includes(event.type));

    return filtered;
  }, [history.present, searchQuery, selectedTypes]);

  // Calculate type statistics
  const typeStats = useMemo(() => {
    const stats: Record<EventType, number> = {
      work: 0,
      personal: 0,
      meeting: 0,
      other: 0,
    };

    history.present.forEach((event) => {
      stats[event.type]++;
    });

    return stats;
  }, [history.present]);

  // Add type toggle handler
  const handleTypeToggle = (type: EventType) => {
    setSelectedTypes((prev) => {
      if (prev.includes(type)) {
        // Don't allow deselecting if it's the last selected type
        if (prev.length === 1) return prev;
        return prev.filter((t) => t !== type);
      }
      return [...prev, type];
    });
  };

  // Add statistics component
  const Statistics = () => {
    const totalEvents = Object.values(typeStats).reduce((a, b) => a + b, 0);

    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border">
        <h3 className="text-sm font-medium text-gray-700 mb-3">
          Event Statistics
        </h3>
        <div className="space-y-2">
          {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => {
            const count = typeStats[type as EventType];
            const percentage = totalEvents
              ? Math.round((count / totalEvents) * 100)
              : 0;

            return (
              <div key={type} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: config.color }}
                />
                <span className="text-sm text-gray-600 flex-1">
                  {config.label}
                </span>
                <span className="text-sm text-gray-500">{count}</span>
                <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: config.color,
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 w-8">{percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Add helper function to check if a date falls within an event's range
  const isDateInEventRange = (date: Date, event: CalendarEvent): boolean => {
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    // Set times to midnight for date comparison
    date.setHours(0, 0, 0, 0);
    eventStart.setHours(0, 0, 0, 0);
    eventEnd.setHours(0, 0, 0, 0);

    return date >= eventStart && date <= eventEnd;
  };

  // Update getEventsForDay to handle multi-day events
  const getEventsForDay = (day: number) => {
    const targetDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );

    return filteredEvents.filter((event) =>
      isDateInEventRange(targetDate, event)
    );
  };

  // Helper to determine event rendering style based on position in range
  const getEventStyle = (event: CalendarEvent, day: number) => {
    const currentDayDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    const eventStart = new Date(event.startDate);
    const eventEnd = new Date(event.endDate);

    const isFirstDay =
      currentDayDate.getTime() === eventStart.setHours(0, 0, 0, 0);
    const isLastDay =
      currentDayDate.getTime() === eventEnd.setHours(0, 0, 0, 0);

    return {
      className: `
        text-xs p-1 mb-1 truncate
        ${isFirstDay ? "rounded-l" : ""}
        ${isLastDay ? "rounded-r" : ""}
        ${!isFirstDay && !isLastDay ? "rounded-none" : ""}
        ${!isLastDay ? "-mr-2 pr-3" : ""}
        ${!isFirstDay ? "-ml-2 pl-3" : ""}
      `,
      style: {
        backgroundColor: EVENT_TYPE_CONFIG[event.type].color,
        color: "white",
      },
    };
  };

  // Helper function to get total filtered events count
  const getFilteredEventsCount = () => {
    return filteredEvents.length;
  };

  // Add this helper function
  const formatTime12Hour = (time24: string): string => {
    try {
      if (!time24) return "";

      const [hours, minutes] = time24.split(":").map(Number);
      if (isNaN(hours) || isNaN(minutes)) return time24;

      const period = hours >= 12 ? "PM" : "AM";
      const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
      return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
    } catch (error) {
      console.error("Error formatting time:", error, time24);
      return time24;
    }
  };

  // Add a function to convert 12-hour time to 24-hour time
  const convertTo24Hour = (time12: string): string => {
    try {
      if (!time12) return "";

      // If already in 24-hour format, return as is
      if (
        !time12.toLowerCase().includes("am") &&
        !time12.toLowerCase().includes("pm")
      ) {
        return time12;
      }

      // Split time and period
      const [timePart, period] = time12.split(/\s*([AaPp][Mm])/);
      let [hours, minutes] = timePart.split(":").map(Number);

      if (isNaN(hours) || isNaN(minutes)) return time12;

      // Convert to 24-hour format
      if (period.toLowerCase() === "pm" && hours !== 12) {
        hours += 12;
      } else if (period.toLowerCase() === "am" && hours === 12) {
        hours = 0;
      }

      return `${hours.toString().padStart(2, "0")}:${minutes
        .toString()
        .padStart(2, "0")}`;
    } catch (error) {
      console.error("Error converting time:", error, time12);
      return time12;
    }
  };

  // Add validation function
  const isValidDropDate = (
    event: CalendarEvent,
    newStartDate: Date,
    newEndDate: Date
  ): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (newStartDate < today) {
      setDragError("Cannot schedule events in the past");
      return false;
    }

    const oneYearFromNow = new Date();
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    if (newStartDate > oneYearFromNow) {
      setDragError("Cannot schedule events more than a year in advance");
      return false;
    }

    // Check for overlapping events across the entire date range
    let currentDate = new Date(newStartDate);
    while (currentDate <= newEndDate) {
      const dayEvents = history.present.filter(
        (e) => isDateInEventRange(currentDate, e) && e.id !== event.id
      );

      const hasConflict = dayEvents.some((existingEvent) => {
        const eventStart = parseInt(event.startTime.replace(":", ""));
        const eventEnd = parseInt(event.endTime.replace(":", ""));
        const existingStart = parseInt(
          existingEvent.startTime.replace(":", "")
        );
        const existingEnd = parseInt(existingEvent.endTime.replace(":", ""));

        return eventStart < existingEnd && eventEnd > existingStart;
      });

      if (hasConflict) {
        setDragError("Time conflict with existing event");
        return false;
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    setDragError(null);
    return true;
  };

  // Update handleDragEnd to handle multi-day events
  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId } = result;
    const event = history.present.find((e) => e.id === draggableId);
    if (!event) return;

    const [, destDay] = result.destination.droppableId.split("-");
    const daysDiff = event.endDate.getDate() - event.startDate.getDate();

    const newStartDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      parseInt(destDay)
    );

    const newEndDate = new Date(newStartDate);
    newEndDate.setDate(newStartDate.getDate() + daysDiff);

    if (!isValidDropDate(event, newStartDate, newEndDate)) {
      return;
    }

    setTimeout(() => {
      const updatedEvent = {
        ...event,
        startDate: newStartDate,
        endDate: newEndDate,
      };
      const newEvents = history.present.map((e) =>
        e.id === draggableId ? updatedEvent : e
      );
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newEvents,
        future: [],
      }));
    }, 50);
  };

  // Add drag start handler to clear any previous errors
  const handleDragStart = () => {
    setDragError(null);
  };

  // Add history manipulation functions
  const pushToHistory = useCallback((newEvents: CalendarEvent[]) => {
    setHistory((prev) => ({
      past: [...prev.past, prev.present],
      present: newEvents,
      future: [],
    }));
  }, []);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const newPast = prev.past.slice(0, -1);
      const newPresent = prev.past[prev.past.length - 1];

      return {
        past: newPast,
        present: newPresent,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const newFuture = prev.future.slice(1);
      const newPresent = prev.future[0];

      return {
        past: [...prev.past, prev.present],
        present: newPresent,
        future: newFuture,
      };
    });
  }, []);

  // Add keyboard shortcut handlers
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [undo, redo]);

  // Add resize handler
  const handleResize = (
    event: CalendarEvent,
    day: number,
    position: "start" | "end",
    delta: number
  ) => {
    const dayDelta = Math.round(delta / 50); // Adjust sensitivity

    if (dayDelta === 0) return;

    const newEvent = { ...event };
    const date = position === "start" ? event.startDate : event.endDate;
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + dayDelta);

    // Validate new dates
    if (position === "start") {
      if (newDate >= event.endDate) return;
      newEvent.startDate = newDate;
    } else {
      if (newDate <= event.startDate) return;
      newEvent.endDate = newDate;
    }

    // Update resizing state
    setResizingEvent({
      id: event.id,
      startDate: newEvent.startDate,
      endDate: newEvent.endDate,
    });

    // Debounced update to avoid too many state changes
    debounce(() => {
      if (!isValidDropDate(newEvent, newEvent.startDate, newEvent.endDate)) {
        setResizingEvent(null);
        return;
      }

      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: prev.present.map((e) => (e.id === event.id ? newEvent : e)),
        future: [],
      }));
      setResizingEvent(null);
    }, 100)();
  };

  // Update event rendering to include resize handles
  const renderEvent = (event: CalendarEvent, day: number, index: number) => {
    const style = getEventStyle(event, day);
    const isFirstDay = new Date(event.startDate).getDate() === day;
    const isLastDay = new Date(event.endDate).getDate() === day;
    const isResizing = resizingEvent?.id === event.id;

    return (
      <Draggable
        key={event.id}
        draggableId={event.id}
        index={index}
        isDragDisabled={!isFirstDay || isResizing}
      >
        {(provided, snapshot) => (
          <motion.div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`
              ${style.className}
              ${snapshot.isDragging ? "opacity-50 z-50" : ""}
              ${isResizing ? "z-50 shadow-lg" : ""}
              relative group
              touch-manipulation
            `}
            style={{
              ...style.style,
              ...provided.draggableProps.style,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85 }}
            layout
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 25,
            }}
          >
            <DragHandle
              dragHandleProps={
                isFirstDay ? provided.dragHandleProps : undefined
              }
              disabled={!isFirstDay || isResizing}
            />

            <ResizeHandle
              position="start"
              onResize={(delta) => handleResize(event, day, "start", delta)}
              disabled={!isFirstDay}
            />

            <div className="px-8">
              {isFirstDay && formatTime12Hour(event.startTime)} {event.title}
              {event.isMultiDay && (
                <span className="text-xs opacity-75">
                  {` (${new Date(event.startDate).getDate()}-${new Date(
                    event.endDate
                  ).getDate()})`}
                </span>
              )}
            </div>

            <ResizeHandle
              position="end"
              onResize={(delta) => handleResize(event, day, "end", delta)}
              disabled={!isLastDay}
            />
          </motion.div>
        )}
      </Draggable>
    );
  };

  // Add debounce utility
  const debounce = (func: Function, wait: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  };

  // Add helper to check if a day is a weekend
  const isWeekend = (day: number): boolean => {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      day
    );
    return date.getDay() === 0 || date.getDay() === 6;
  };

  // Add this helper function to get background color for days with events
  const getDayBackgroundColor = (day: number) => {
    const events = getEventsForDay(day);
    if (events.length === 0) return "";

    // If there are multiple events, show a gradient
    if (events.length > 1) {
      return "bg-gradient-to-br from-blue-50 to-purple-50";
    }

    // For single event, show a light version of the event type color
    const eventColor = EVENT_TYPE_CONFIG[events[0].type].color;
    return `bg-${eventColor}-50/30`;
  };

  // Update the calendar grid rendering
  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDayOfMonth = getFirstDayOfMonth(currentDate);
    const today = new Date();
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className={`
            p-2 h-24 bg-gray-50/50 border border-gray-100
            ${isWeekend(i) ? "bg-red-50/50" : ""}
          `}
        />
      );
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        day === today.getDate() &&
        currentDate.getMonth() === today.getMonth() &&
        currentDate.getFullYear() === today.getFullYear();

      const isSelected =
        day === selectedDate.getDate() &&
        currentDate.getMonth() === selectedDate.getMonth() &&
        currentDate.getFullYear() === selectedDate.getFullYear();

      const dayEvents = getEventsForDay(day);
      const isWeekendDay = isWeekend(day);

      days.push(
        <Droppable droppableId={`day-${day}`} key={day}>
          {(provided, snapshot) => {
            const isInvalidDate =
              new Date(
                currentDate.getFullYear(),
                currentDate.getMonth(),
                day
              ).getTime() < new Date().setHours(0, 0, 0, 0);

            return (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                onClick={() => handleDayClick(day)}
                className={`
                  relative h-24 p-2 border transition-all duration-200
                  ${isWeekendDay ? "border-red-100" : "border-gray-200"}
                  ${isToday ? "ring-2 ring-blue-400 ring-inset" : ""}
                  ${isSelected ? "ring-2 ring-purple-400 ring-inset" : ""}
                  ${
                    snapshot.isDraggingOver && !isInvalidDate
                      ? "bg-blue-50"
                      : ""
                  }
                  ${
                    isInvalidDate
                      ? "bg-gray-100 cursor-not-allowed"
                      : "cursor-pointer"
                  }
                  ${
                    snapshot.isDraggingOver && isInvalidDate ? "bg-red-100" : ""
                  }
                  ${isWeekendDay ? "hover:bg-red-50/50" : "hover:bg-gray-50"}
                  ${isToday && isSelected ? "ring-[3px] ring-indigo-400" : ""}
                  ${getDayBackgroundColor(day)}
                `}
              >
                <div
                  className={`
                    flex items-center justify-center w-8 h-8 mx-auto mb-1 rounded-full
                    transition-all duration-200
                    ${isToday ? "bg-blue-500 text-white shadow-sm" : ""}
                    ${isSelected ? "bg-purple-500 text-white shadow-sm" : ""}
                    ${isToday && isSelected ? "bg-indigo-500" : ""}
                    ${
                      isWeekendDay && !isToday && !isSelected
                        ? "text-red-600"
                        : ""
                    }
                  `}
                >
                  {day}
                </div>

                <div className="overflow-y-auto max-h-14">
                  <AnimatePresence mode="popLayout">
                    {dayEvents.map((event, index) =>
                      renderEvent(event, day, index)
                    )}
                  </AnimatePresence>
                  {provided.placeholder}
                </div>
              </div>
            );
          }}
        </Droppable>
      );
    }

    return days;
  };

  // Add touch event handlers for better mobile support
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (
        e.target instanceof Element &&
        (e.target.closest(".cursor-grab") ||
          e.target.closest(".cursor-col-resize"))
      ) {
        e.preventDefault();
      }
    };

    document.addEventListener("touchmove", preventScroll, { passive: false });
    return () => document.removeEventListener("touchmove", preventScroll);
  }, []);

  // Add a legend component
  const EventLegend = () => (
    <div className="flex gap-4 items-center justify-center mb-4">
      {Object.entries(EVENT_TYPE_CONFIG).map(([type, config]) => (
        <div key={type} className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: config.color }}
          />
          <span className="text-xs text-gray-600">{config.label}</span>
        </div>
      ))}
    </div>
  );

  // Add effect to save events when they change
  useEffect(() => {
    saveEvents(history.present);
  }, [history.present]);

  // Update the search functionality to show matching events immediately
  const SearchResults = () => {
    if (!searchQuery.trim()) return null;

    const matchingEvents = filteredEvents.sort(
      (a, b) => a.startDate.getTime() - b.startDate.getTime()
    );

    if (matchingEvents.length === 0) {
      return (
        <div className="p-4 text-gray-500 text-center">
          No events found matching "{searchQuery}"
        </div>
      );
    }

    return (
      <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
        {matchingEvents.map((event) => (
          <div
            key={event.id}
            className="flex items-center gap-2 p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
            onClick={(e) => {
              handleEventClick(event, e);
              setSearchQuery(""); // Clear search after selection
            }}
          >
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: EVENT_TYPE_CONFIG[event.type].color }}
            />
            <div className="flex-grow">
              <div className="font-medium">{event.title}</div>
              <div className="text-sm text-gray-500">
                {new Date(event.startDate).toLocaleDateString()} at{" "}
                {event.startTime}
              </div>
            </div>
            <div
              className="text-xs px-2 py-1 rounded-full"
              style={{
                backgroundColor: `${EVENT_TYPE_CONFIG[event.type].color}20`,
                color: EVENT_TYPE_CONFIG[event.type].color,
              }}
            >
              {EVENT_TYPE_CONFIG[event.type].label}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Add this function near the top of CalendarView component
  const downloadEventsAsJson = () => {
    try {
      // Convert events to the desired format
      const eventsForDownload = history.present.map((event) => ({
        id: event.id,
        date: event.startDate.toLocaleDateString("en-GB"),
        name: event.title,
        startTime: event.startTime,
        endTime: event.endTime,
        description: event.description,
        type: event.type,
      }));

      // Create blob and download link
      const jsonString = JSON.stringify(eventsForDownload, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      // Create and trigger download
      const link = document.createElement("a");
      link.href = url;
      link.download = `calendar-events-${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading events:", error);
      alert("Failed to download events. Please try again.");
    }
  };

  // Add this function to convert events to CSV format
  const downloadEventsAsCsv = () => {
    try {
      // Define CSV headers
      const headers = [
        "Date",
        "Title",
        "Start Time",
        "End Time",
        "Type",
        "Description",
      ];

      // Convert events to CSV rows
      const rows = history.present.map((event) => [
        event.startDate.toLocaleDateString("en-GB"),
        event.title,
        event.startTime,
        event.endTime,
        EVENT_TYPE_CONFIG[event.type].label,
        event.description || "",
      ]);

      // Combine headers and rows
      const csvContent = [
        headers.join(","),
        ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
      ].join("\n");

      // Create and trigger download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `calendar-events-${
        new Date().toISOString().split("T")[0]
      }.csv`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      alert("Failed to download CSV. Please try again.");
    }
  };

  // Update handleModalSave to be more explicit
  const handleModalSave = async (eventData: Omit<CalendarEvent, "id">) => {
    try {
      if (!eventData.title) {
        alert("Please enter an event title");
        return;
      }

      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventData.title.trim(),
        description: eventData.description?.trim() || "",
        startDate: selectedDate,
        endDate: selectedDate,
        startTime: eventData.startTime || "09:00",
        endTime: eventData.endTime || "10:00",
        type: eventData.type || "other",
        isMultiDay: false,
      };

      // Update state and save
      const newPresent = [...history.present, newEvent];

      // Save to storage first
      await saveEvents(newPresent);

      // Then update state
      setHistory((prev) => ({
        past: [...prev.past, prev.present],
        present: newPresent,
        future: [],
      }));

      // Show success notification
      setShowSaveNotification(true);
      setTimeout(() => setShowSaveNotification(false), 2000);

      // Close modal
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save event:", error);
      alert("Failed to save event. Please try again.");
    }
  };

  // Add this useEffect to verify storage is working
  useEffect(() => {
    if (history.present.length > 0) {
      console.log("Saving events:", history.present);
      saveEvents(history.present).catch((error) => {
        console.error("Failed to save events:", error);
      });
    }
  }, [history.present]);

  // Add useEffect to load events
  useEffect(() => {
    loadEvents().then((events) => {
      setHistory((prev) => ({
        ...prev,
        present: events,
      }));
    });
  }, []);

  return (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className={`max-w-2xl mx-auto ${spacing.container}`}>
        {/* Header section with semi-transparent background */}
        <div className={`${spacing.section} bg-white/90 backdrop-blur-sm rounded-lg p-4`}>
          {/* Events list with transparency */}
          {filteredEvents.length > 0 && (
            <div className="mb-4 p-4 bg-white/80 rounded-lg shadow-sm backdrop-blur-sm">
              <h3 className="text-lg font-semibold mb-2">Upcoming Events</h3>
              <div className="space-y-2">
                {filteredEvents
                  .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
                  .slice(0, 3) // Show only the next 3 events
                  .map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                      onClick={(e) => handleEventClick(event, e)}
                    >
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: EVENT_TYPE_CONFIG[event.type].color,
                        }}
                      />
                      <span className="font-medium">{event.title}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(event.startDate).toLocaleDateString()} at{" "}
                        {event.startTime}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Search and filters with transparency */}
          <div className={`${spacing.stack} bg-white/70 p-4 rounded-lg`}>
            <div className="relative">
              <SearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search events..."
              />
              <SearchResults />
            </div>
            <TypeFilter
              selectedTypes={selectedTypes}
              onToggleType={handleTypeToggle}
              typeCounts={typeStats}
            />
          </div>

          {/* Calendar navigation with transparency */}
          <div className="flex justify-between items-center mb-4 bg-white/75 p-3 rounded-lg">
            <button
              onClick={() => {
                setSelectedEvent(undefined);
                setModalMode("create");
                setSelectedDate(new Date());
                setIsModalOpen(true);
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                  clipRule="evenodd"
                />
              </svg>
              Add Event
            </button>

            <div className="flex gap-2">
              <button
                onClick={handlePreviousMonth}
                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                Previous
              </button>
              <h2 className={typography.h2}>{formatMonthYear(currentDate)}</h2>
              <button
                onClick={handleNextMonth}
                className="px-4 py-2 bg-gray-100 rounded hover:bg-gray-200"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {/* Calendar grid with layered transparency */}
        <div className="grid grid-cols-7 gap-1 border border-gray-200 rounded-lg p-4 bg-white/95 shadow-sm backdrop-blur-sm">
          {/* Weekday headers with subtle transparency */}
          {weekDays.map((day) => (
            <div
              key={day.short}
              className={`
                p-2 text-center font-semibold border-b-2
                ${typography.small}
                ${
                  day.isWeekend
                    ? "text-red-600 bg-red-50/80 border-red-200/80"
                    : "text-gray-600 bg-gray-50/80 border-gray-200/80"
                }
              `}
              title={day.long}
            >
              {day.short}
            </div>
          ))}
          {renderCalendarGrid()}
        </div>

        {/* Error messages */}
        {dragError && (
          <div
            className={`mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md ${typography.small}`}
          >
            <div className="flex items-center">
              <svg
                className="h-5 w-5 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {dragError}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className={`flex justify-between mt-4 ${spacing.inline}`}>
          <div className="flex gap-2">
            <button
              onClick={downloadEventsAsJson}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2 transition-colors"
              title="Download events as JSON"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              JSON
            </button>

            <button
              onClick={downloadEventsAsCsv}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 flex items-center gap-2 transition-colors"
              title="Download events as CSV"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Download CSV
            </button>
          </div>

          <div className="flex gap-2">
            <button
              onClick={undo}
              disabled={history.past.length === 0}
              className={`p-2 rounded-md ${
                history.past.length === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="Undo (Ctrl+Z)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
            <button
              onClick={redo}
              disabled={history.future.length === 0}
              className={`p-2 rounded-md ${
                history.future.length === 0
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
              title="Redo (Ctrl+Shift+Z)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10.293 14.707a1 1 0 001.414 0l4-4a1 1 0 000-1.414l-4-4a1 1 0 00-1.414 1.414L12.586 9H5a1 1 0 100 2h7.586l-2.293 2.293a1 1 0 000 1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>

        <EventModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleModalSave}
          onDelete={handleDeleteEvent}
          onUpdate={handleUpdateEvent}
          selectedDate={selectedDate}
          selectedEvent={selectedEvent}
          mode={modalMode}
          eventsForDay={getEventsForDay(selectedDate.getDate())}
          searchQuery={searchQuery}
        />

        {showSaveNotification && (
          <div className="fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg animate-fade-in-out">
            Event saved successfully!
          </div>
        )}
      </div>
    </DragDropContext>
  );
};

export default CalendarView;
