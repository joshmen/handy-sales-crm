"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Visit } from "@/types/calendar";
import { useFormatters } from "@/hooks/useFormatters";

interface CalendarViewProps {
  visits: Visit[];
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  onVisitClick: (visit: Visit) => void;
  selectedUser?: string;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  visits,
  currentDate,
  onDateSelect,
  onVisitClick,
  selectedUser,
}) => {
  const tcal = useTranslations("visits.calendar");
  // "Hoy" en TZ tenant — el highlight `isToday` antes dependía del browser.
  const { tenantToday } = useFormatters();
  const todayKey = tenantToday();
  const ymd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const [viewMode] = useState<"month" | "week" | "day">("month");

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days = [];

    // Días del mes anterior para completar la primera semana
    for (let i = startDay - 1; i >= 0; i--) {
      const prevDate = new Date(year, month, -i);
      days.push({ date: prevDate, isCurrentMonth: false });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({ date, isCurrentMonth: true });
    }

    // Días del siguiente mes para completar la última semana
    const remainingDays = 42 - days.length; // 6 semanas × 7 días
    for (let day = 1; day <= remainingDays; day++) {
      const nextDate = new Date(year, month + 1, day);
      days.push({ date: nextDate, isCurrentMonth: false });
    }

    return days;
  };

  const getVisitsForDate = (date: Date) => {
    return visits.filter((visit) => {
      const visitDate = new Date(visit.date);
      return (
        visitDate.toDateString() === date.toDateString() &&
        (!selectedUser || visit.userId === selectedUser)
      );
    });
  };

  // 🎨 COLORES MEJORADOS CON MEJOR CONTRASTE
  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-info-200 text-info-900 border border-info-300 font-medium";
      case "completed":
        return "bg-success-200 text-success-900 border border-success-300 font-medium";
      case "cancelled":
        return "bg-error-200 text-error-900 border border-error-300 font-medium";
      case "in_progress":
        return "bg-warning-200 text-warning-900 border border-warning-300 font-medium";
      default:
        return "bg-surface-3 text-foreground border border-border-default font-medium";
    }
  };

  const monthName = currentDate.toLocaleDateString("es-ES", {
    month: "long",
    year: "numeric",
  });
  const days = getDaysInMonth(currentDate);
  const weekDays = tcal.raw("weekdaysLong") as string[];

  if (viewMode === "month") {
    return (
      <div>
        {/* 🎨 TÍTULO CON MEJOR CONTRASTE */}
        <h3 className="text-lg font-semibold mb-4 capitalize text-foreground">
          {monthName} (
          {currentDate.toLocaleDateString("es-ES", {
            day: "2-digit",
            month: "short",
          })}{" "}
          -{" "}
          {new Date(
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            0
          ).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
          )
        </h3>

        <div className="grid grid-cols-7 gap-1 border border-border-subtle rounded-lg overflow-hidden">
          {/* 🎨 ENCABEZADOS CON MEJOR CONTRASTE */}
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center font-semibold p-3 text-sm bg-surface-3 text-foreground border-b border-border-subtle"
            >
              {day}
            </div>
          ))}

          {/* Días del calendario */}
          {days.map((dayInfo, index) => {
            const dayVisits = getVisitsForDate(dayInfo.date);
            const isToday = ymd(dayInfo.date) === todayKey;

            return (
              <div
                key={index}
                className={`border-r border-b border-border-subtle min-h-[100px] p-2 cursor-pointer hover:bg-blue-50 transition-colors ${
                  !dayInfo.isCurrentMonth
                    ? "bg-surface-1 text-muted-foreground"
                    : "bg-white"
                } ${
                  isToday
                    ? "bg-blue-100 border-blue-400 ring-1 ring-blue-300"
                    : ""
                }`}
                onClick={() => onDateSelect(dayInfo.date)}
              >
                {/* 🎨 NÚMERO DEL DÍA CON MEJOR CONTRASTE */}
                <div
                  className={`text-sm font-semibold mb-2 ${
                    isToday
                      ? "text-blue-800 bg-blue-200 rounded-full w-6 h-6 flex items-center justify-center"
                      : !dayInfo.isCurrentMonth
                      ? "text-muted-foreground"
                      : "text-foreground"
                  }`}
                >
                  {dayInfo.date.getDate()}
                </div>

                {/* Visitas del día */}
                <div className="space-y-1">
                  {dayVisits.slice(0, 3).map((visit) => (
                    <div
                      key={visit.id}
                      className={`text-xs px-2 py-1 rounded-md cursor-pointer hover:shadow-sm transition-shadow ${getStatusColor(
                        visit.status
                      )}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onVisitClick(visit);
                      }}
                    >
                      <div className="truncate">
                        <span className="font-medium">{visit.startTime}</span>
                        <br />
                        <span>{visit.client.name}</span>
                      </div>
                    </div>
                  ))}

                  {dayVisits.length > 3 && (
                    <div className="text-xs text-foreground/80 px-2 font-medium bg-surface-3 rounded py-1">
                      {tcal("moreItems", { count: dayVisits.length - 3 })}
                    </div>
                  )}

                  {/* 🎨 MARCADOR ESPECIAL MEJORADO */}
                  {dayInfo.date.getDate() === 2 && dayInfo.isCurrentMonth && (
                    <div className="bg-success-300 text-success-900 text-xs px-2 py-1 rounded-md text-center font-bold border border-success-400">
                      {tcal("specialDay")}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 text-foreground/70">
      <p className="text-lg font-medium">{tcal("viewInDevelopment", { mode: viewMode })}</p>
      <p className="text-sm text-muted-foreground mt-2">{tcal("comingSoon")}</p>
    </div>
  );
};
