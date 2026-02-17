/* eslint-disable @typescript-eslint/no-explicit-any */
import { User, Client } from "./index";

export interface Visit {
  id: string;
  clientId: string;
  client: Client;
  userId: string;
  user: User;
  date: Date;
  startTime: string;
  endTime?: string;
  duration?: number;
  status: "scheduled" | "completed" | "cancelled" | "in_progress";
  type: "sales" | "delivery" | "follow_up" | "meeting";
  priority: "low" | "medium" | "high";
  notes?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  formResponses?: FormResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FormResponse {
  id: string;
  formId: string;
  visitId: string;
  responses: Record<string, any>;
  createdAt: Date;
}

export interface VisitRule {
  id: string;
  name: string;
  clientType: string[];
  zones: string[];
  frequency: "daily" | "weekly" | "monthly";
  dayOfWeek?: number;
  dayOfMonth?: number;
  isActive: boolean;
}
