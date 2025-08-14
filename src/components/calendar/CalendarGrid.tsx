import React from "react";
import { Visit } from "@/types/calendar";

interface CalendarGridProps {
  currentDate: Date;
  viewMode: "month" | "week" | "day";
  visits: Visit[];
  onDateClick: (date: Date) => void;
  onVisitClick: (visit: Visit) => void;
  selectedUser?: string;
  className?: string;
}

interface DayInfo {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected?: boolean;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  viewMode,
  visits,
  onDateClick,
  onVisitClick,
  selectedUser,
  className = "",
}) => {
  const getDaysForView = (): DayInfo[] => {
    const today = new Date();

    switch (viewMode) {
      case "month":
        return getMonthDays(currentDate, today);
      case "week":
        return getWeekDays(currentDate, today);
      case "day":
        return [getDayInfo(currentDate, today)];
      default:
        return [];
    }
  };

  const getMonthDays = (date: Date, today: Date): DayInfo[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days: DayInfo[] = [];

    // Días del mes anterior
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({
        date: prevDate,
        isCurrentMonth: false,
        isToday: prevDate.toDateString() === today.toDateString(),
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isToday: dayDate.toDateString() === today.toDateString(),
      });
    }

    // Días del siguiente mes
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({
        date: nextDate,
        isCurrentMonth: false,
        isToday: nextDate.toDateString() === today.toDateString(),
      });
    }

    return days;
  };

  const getWeekDays = (date: Date, today: Date): DayInfo[] => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Lunes

    const days: DayInfo[] = [];
    for (let i = 0; i < 7; i++) {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + i);
      days.push({
        date: dayDate,
        isCurrentMonth: true,
        isToday: dayDate.toDateString() === today.toDateString(),
      });
    }

    return days;
  };

  const getDayInfo = (date: Date, today: Date): DayInfo => ({
    date: new Date(date),
    isCurrentMonth: true,
    isToday: date.toDateString() === today.toDateString(),
  });

  const getVisitsForDate = (date: Date): Visit[] => {
    return visits.filter((visit) => {
      const visitDate = new Date(visit.date);
      const matchesDate = visitDate.toDateString() === date.toDateString();
      const matchesUser = !selectedUser || visit.userId === selectedUser;
      return matchesDate && matchesUser;
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "scheduled":
        return "bg-info-200 text-info-900 border border-info-300";
      case "completed":
        return "bg-success-200 text-success-900 border border-success-300";
      case "cancelled":
        return "bg-error-200 text-error-900 border border-error-300";
      case "in_progress":
        return "bg-warning-200 text-warning-900 border border-warning-300";
      default:
        return "bg-gray-200 text-gray-900 border border-gray-300";
    }
  };

  const renderVisitItem = (visit: Visit) => (
    <div
      key={visit.id}
      className={`text-xs px-2 py-1 rounded-md cursor-pointer hover:shadow-sm transition-all duration-200 ${getStatusColor(
        visit.status
      )}`}
      onClick={(e) => {
        e.stopPropagation();
        onVisitClick(visit);
      }}
    >
      <div className="truncate">
        <div className="font-medium">{visit.startTime}</div>
        <div className="truncate">{visit.client.name}</div>
        {visit.type && (
          <div className="text-xs opacity-75 capitalize">{visit.type}</div>
        )}
      </div>
    </div>
  );

  const renderMonthView = (days: DayInfo[]) => {
    const weekDays = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* Encabezados de días */}
        <div className="grid grid-cols-7 bg-gray-50">
          {weekDays.map((day) => (
            <div
              key={day}
              className="p-4 text-center font-semibold text-sm text-gray-700 border-r border-gray-200 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Días del calendario */}
        <div className="grid grid-cols-7">
          {days.map((dayInfo, index) => {
            const dayVisits = getVisitsForDate(dayInfo.date);

            return (
              <div
                key={index}
                className={`min-h-[120px] p-2 border-r border-b border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-50 transition-colors ${
                  !dayInfo.isCurrentMonth
                    ? "bg-gray-50 text-gray-400"
                    : "bg-white"
                } ${dayInfo.isToday ? "bg-blue-100 ring-2 ring-blue-300" : ""}`}
                onClick={() => onDateClick(dayInfo.date)}
              >
                {/* Número del día */}
                <div
                  className={`text-sm font-semibold mb-2 ${
                    dayInfo.isToday
                      ? "bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center"
                      : !dayInfo.isCurrentMonth
                      ? "text-gray-400"
                      : "text-gray-800"
                  }`}
                >
                  {dayInfo.date.getDate()}
                </div>

                {/* Visitas del día */}
                <div className="space-y-1">
                  {dayVisits.slice(0, 3).map(renderVisitItem)}

                  {dayVisits.length > 3 && (
                    <div className="text-xs text-gray-600 px-2 py-1 bg-gray-100 rounded font-medium">
                      +{dayVisits.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWeekView = (days: DayInfo[]) => {
    const weekDays = [
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
      "Domingo",
    ];

    return (
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="grid grid-cols-7 bg-gray-50">
          {days.map((dayInfo, index) => (
            <div
              key={index}
              className={`p-4 text-center border-r border-gray-200 last:border-r-0 cursor-pointer hover:bg-blue-50 ${
                dayInfo.isToday ? "bg-blue-100 ring-2 ring-blue-300" : ""
              }`}
              onClick={() => onDateClick(dayInfo.date)}
            >
              <div className="text-sm font-medium text-gray-600">
                {weekDays[index]}
              </div>
              <div
                className={`text-lg font-bold ${
                  dayInfo.isToday
                    ? "bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto mt-1"
                    : "text-gray-900 mt-1"
                }`}
              >
                {dayInfo.date.getDate()}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((dayInfo, index) => {
            const dayVisits = getVisitsForDate(dayInfo.date);

            return (
              <div
                key={index}
                className="min-h-[200px] p-3 border-r border-gray-200 last:border-r-0 bg-white"
              >
                <div className="space-y-2">
                  {dayVisits.map(renderVisitItem)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDayView = (dayInfo: DayInfo) => {
    const dayVisits = getVisitsForDate(dayInfo.date);

    return (
      <div className="border border-gray-200 rounded-lg bg-white p-6">
        <div className="text-center mb-6">
          <h3 className="text-2xl font-bold text-gray-900">
            {dayInfo.date.toLocaleDateString("es-ES", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>
          {dayInfo.isToday && (
            <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              Hoy
            </span>
          )}
        </div>

        <div className="space-y-4">
          {dayVisits.length > 0 ? (
            <div className="grid gap-3">
              {dayVisits.map((visit) => (
                <div
                  key={visit.id}
                  className={`p-4 rounded-lg cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(
                    visit.status
                  )}`}
                  onClick={() => onVisitClick(visit)}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">
                        {visit.client.name}
                      </h4>
                      <p className="text-sm opacity-80">{visit.address}</p>
                      {visit.notes && (
                        <p className="text-sm mt-1 opacity-90">{visit.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{visit.startTime}</div>
                      {visit.endTime && (
                        <div className="text-sm opacity-80">
                          - {visit.endTime}
                        </div>
                      )}
                      <div className="text-xs mt-1 capitalize opacity-75">
                        {visit.type} • {visit.priority}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-lg font-medium mb-2">
                No hay visitas programadas
              </h3>
              <p className="text-sm">
                Haz clic aquí para programar una nueva visita
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  const days = getDaysForView();

  return (
    <div className={className}>
      {viewMode === "month" && renderMonthView(days)}
      {viewMode === "week" && renderWeekView(days)}
      {viewMode === "day" && renderDayView(days[0])}
    </div>
  );
};
