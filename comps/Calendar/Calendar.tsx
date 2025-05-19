import React from 'react';

interface CalendarProps {
    mode: 'single' | 'multiple';
    selected: Date | null;
    onSelect: (date: Date | null) => void;
    disabled?: Date[];
    className?: string;
}

const Calendar: React.FC<CalendarProps> = ({
    mode,
    selected,
    onSelect,
    disabled = [],
    className = '',
}) => {
    const isDisabled = (date: Date) => {
        return disabled.some(
            (disabledDate) =>
                disabledDate.toDateString() === date.toDateString()
        );
    };

    const handleDateClick = (date: Date) => {
        if (!isDisabled(date)) {
            onSelect(date);
        }
    };

    return (
        <div className={`calendar ${className}`}>
            {/* Render calendar UI here */}
            <p>Mode: {mode}</p>
            <p>Selected Date: {selected?.toDateString() || 'None'}</p>
            <button
                onClick={() => handleDateClick(new Date())}
                disabled={isDisabled(new Date())}
            >
                Select Today
            </button>
        </div>
    );
};

export default Calendar;