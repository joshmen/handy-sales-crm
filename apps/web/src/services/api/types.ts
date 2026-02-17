export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T | null;
  error: string | null;
}