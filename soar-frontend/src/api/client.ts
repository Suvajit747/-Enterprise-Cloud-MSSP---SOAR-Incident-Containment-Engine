import axios, { AxiosError } from "axios";
import type { ApiErrorDetail } from "@/types";

/**
 * The backend base URL is the only backend-related value the frontend is
 * configured with. Never add API keys or secrets to VITE_* variables —
 * anything prefixed VITE_ is bundled into client-side JavaScript and is
 * publicly visible.
 */
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Normalized application-level error. Every API failure (network, 4xx, 5xx)
 * is converted to this shape so UI components can render a consistent
 * message without knowing about Axios internals.
 */
export class ApiError extends Error {
  status?: number;
  fieldErrors?: { field: string; message: string }[];

  constructor(message: string, status?: number, fieldErrors?: { field: string; message: string }[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorDetail>) => {
    if (!error.response) {
      return Promise.reject(
        new ApiError(
          "Cannot reach the SOAR backend. Confirm it is running and that VITE_API_BASE_URL is correct.",
        ),
      );
    }

    const { status, data } = error.response;

    if (status === 404) {
      return Promise.reject(new ApiError(extractDetailString(data) || "Resource not found", status));
    }

    if (status === 422) {
      const fieldErrors = extractValidationErrors(data);
      return Promise.reject(
        new ApiError("Validation failed. Check the highlighted fields.", status, fieldErrors),
      );
    }

    if (status >= 500) {
      return Promise.reject(
        new ApiError("The SOAR backend encountered an internal error. Try again shortly.", status),
      );
    }

    return Promise.reject(new ApiError(extractDetailString(data) || "Request failed", status));
  },
);

function extractDetailString(data: ApiErrorDetail | undefined): string | null {
  if (!data || !data.detail) return null;
  if (typeof data.detail === "string") return data.detail;
  if (Array.isArray(data.detail)) {
    return data.detail.map((d) => d.msg).join(", ");
  }
  return null;
}

function extractValidationErrors(
  data: ApiErrorDetail | undefined,
): { field: string; message: string }[] | undefined {
  if (!data || !Array.isArray(data.detail)) return undefined;
  return data.detail.map((d) => ({
    field: String(d.loc?.[d.loc.length - 1] ?? "field"),
    message: d.msg,
  }));
}
