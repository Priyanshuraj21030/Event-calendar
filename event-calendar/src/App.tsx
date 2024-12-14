import CalendarView from './components/calendar/CalendarView';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Event Calendar</h1>
        <CalendarView />
      </div>
    </div>
  );
}

export default App; 