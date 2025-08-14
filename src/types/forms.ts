/* eslint-disable @typescript-eslint/no-explicit-any */
import { User } from "./index";

export interface Form {
  id: string;
  name: string;
  description?: string;
  version: number;
  type: "sales" | "delivery" | "survey" | "inspection";
  isActive: boolean;
  components: FormComponent[];
  createdAt: Date;
  updatedAt: Date;
}

export interface FormComponent {
  id: string;
  type:
    | "text"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "signature"
    | "photo"
    | "products"
    | "number"
    | "date";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: FormOption[];
  validation?: FormValidation;
  order: number;
  width?: "full" | "half" | "third";
}

export interface FormOption {
  value: string;
  label: string;
}

export interface FormValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
}

export interface FormSubmission {
  id: string;
  formId: string;
  form: Form;
  visitId?: string;
  userId: string;
  user: User;
  responses: Record<string, any>;
  createdAt: Date;
}
