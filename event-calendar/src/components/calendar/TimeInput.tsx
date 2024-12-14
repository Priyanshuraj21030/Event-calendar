import React from 'react';

interface TimeInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  error?: boolean;
}

const TimeInput: React.FC<TimeInputProps> = ({
  value,
  onChange,
  disabled = false,
  className = '',
  error = false,
}) => {
  // Convert 24h time to 12h format
  const to12Hour = (time: string): { hours: string; minutes: string; period: string } => {
    const [hours, minutes] = time.split(':');
    const hoursNum = parseInt(hours);
    return {
      hours: hoursNum === 0 ? '12' : hoursNum > 12 ? (hoursNum - 12).toString() : hours,
      minutes,
      period: hoursNum >= 12 ? 'PM' : 'AM'
    };
  };

  // Convert 12h time back to 24h format
  const to24Hour = (hours: string, minutes: string, period: string): string => {
    let hoursNum = parseInt(hours);
    if (period === 'PM' && hoursNum !== 12) hoursNum += 12;
    if (period === 'AM' && hoursNum === 12) hoursNum = 0;
    return `${hoursNum.toString().padStart(2, '0')}:${minutes}`;
  };

  const { hours, minutes, period } = to12Hour(value);

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(to24Hour(e.target.value, minutes, period));
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(to24Hour(hours, e.target.value, period));
  };

  const handlePeriodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(to24Hour(hours, minutes, e.target.value));
  };

  return (
    <div className={`flex gap-1 ${className}`}>
      <select
        value={hours}
        onChange={handleHourChange}
        disabled={disabled}
        className={`
          px-2 py-2 border rounded-md ${disabled ? 'bg-gray-100' : ''}
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      >
        {Array.from({ length: 12 }, (_, i) => (i + 1).toString())
          .map(hour => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
      </select>
      <select
        value={minutes}
        onChange={handleMinuteChange}
        disabled={disabled}
        className={`
          px-2 py-2 border rounded-md ${disabled ? 'bg-gray-100' : ''}
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      >
        {Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
          .map(minute => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
      </select>
      <select
        value={period}
        onChange={handlePeriodChange}
        disabled={disabled}
        className={`
          px-2 py-2 border rounded-md ${disabled ? 'bg-gray-100' : ''}
          ${error ? 'border-red-500' : 'border-gray-300'}
        `}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};

export default TimeInput; 