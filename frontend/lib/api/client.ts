// ============================================================
// API CLIENT - Backend Communication
// ============================================================
import { TextDetectionResult, ImageDetectionResult } from "@/types";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
// Additional types for API client
export type ImageDetectionMode = "ai" | "deepfake" | "both";

export interface ServiceStatus {
  status: "healthy" | "degraded" | "unhealthy";
  services: {
    text_detection: boolean;
    image_detection: boolean;
    deepfake_detection: boolean;
  };
  timestamp: string;
  version: string;
}

export interface ApiErrorDetails {
  detail?: string;
  code?: string;
  field?: string;
}

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public details?: ApiErrorDetails
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      ...options,
      headers: { ...options.headers },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiRequestError(
        errorData.detail || `Request failed with status ${response.status}`,
        response.status,
        errorData
      );
    }
    return await response.json();
  } catch (error) {
    if (error instanceof ApiRequestError) throw error;
    throw new ApiRequestError(
      error instanceof Error ? error.message : "Network error",
      0
    );
  }
}
export async function detectText(text: string): Promise<TextDetectionResult> {
  return apiRequest<TextDetectionResult>("/api/detect/text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
}
export async function detectImage(
  file: File,
  detectionType: ImageDetectionMode = "both"
): Promise<ImageDetectionResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("detection_type", detectionType);
  return apiRequest<ImageDetectionResult>("/api/detect/image", {
    method: "POST",
    body: formData,
  });
}
export async function getServiceStatus(): Promise<ServiceStatus> {
  return apiRequest<ServiceStatus>("/api/status");
}
export async function healthCheck(): Promise<{ status: string }> {
  return apiRequest<{ status: string }>("/api/health");
}
// Utility function to check if API is available
export async function checkApiAvailability(): Promise<boolean> {
  try {
    await healthCheck();
    return true;
  } catch {
    return false;
  }
}

// Utility function to get API base URL
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}

// Utility function to handle file upload with progress
export async function detectImageWithProgress(
  file: File,
  detectionType: ImageDetectionMode = "both",
  onProgress?: (progress: number) => void
): Promise<ImageDetectionResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    formData.append("file", file);
    formData.append("detection_type", detectionType);

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText);
          resolve(result);
        } catch {
          reject(new ApiRequestError("Invalid response format", xhr.status));
        }
      } else {
        try {
          const errorData = JSON.parse(xhr.responseText);
          reject(
            new ApiRequestError(
              errorData.detail || `Request failed with status ${xhr.status}`,
              xhr.status,
              errorData
            )
          );
        } catch {
          reject(
            new ApiRequestError(
              `Request failed with status ${xhr.status}`,
              xhr.status
            )
          );
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new ApiRequestError("Network error", 0));
    });

    xhr.open("POST", `${API_BASE_URL}/api/detect/image`);
    xhr.send(formData);
  });
}

// Main API object with organized methods
export const api = {
  text: {
    detect: detectText,
  },
  image: {
    detect: detectImage,
    detectWithProgress: detectImageWithProgress,
  },
  system: {
    status: getServiceStatus,
    health: healthCheck,
    checkAvailability: checkApiAvailability,
  },
  utils: {
    getBaseUrl: getApiBaseUrl,
  },
};

export default api;
