export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export type EventItem = {
  id: string;
  event_name: string;
  description?: string | null;
  event_date: string;
  instagram_username?: string | null;
  cover_image?: string | null;
  event_link: string;
  total_photos: number;
  payment_amount_paise: number;
  payment_required: boolean;
};

export type PhotoItem = {
  id: string;
  event_id: string;
  image_path: string;
  upload_date: string;
  processing_status: string;
  processing_error?: string | null;
  processed_at?: string | null;
};

export type DashboardStats = {
  total_events: number;
  recent_events: EventItem[];
};

export type FaceItem = {
  id: string;
  photo_id: string;
  event_id: string;
  image_path: string;
  face_coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
    image_width: number;
    image_height: number;
  };
  confidence_score: number;
  created_at?: string | null;
};

export type ProcessingStatus = {
  total_uploaded_images: number;
  total_detected_faces: number;
  pending_images: number;
  processing_images: number;
  processed_images: number;
  failed_images: number;
  status: string;
};

export type PublicEvent = {
  id: string;
  event_name: string;
  description?: string | null;
  event_date: string;
  instagram_username?: string | null;
  cover_image?: string | null;
  payment_amount_paise: number;
  payment_required: boolean;
};

export type GuestMatchPhoto = {
  photo_id: string;
  image_path: string;
  best_similarity: number;
};

export type GuestMatchResponse = {
  match_session_id: string;
  event_id: string;
  status: string;
  message?: string | null;
  error_message?: string | null;
  threshold?: number;
  matches: GuestMatchPhoto[];
};

export type PaymentOrder = {
  key_id: string;
  order_id: string;
  amount_paise: number;
  currency: string;
  event_name: string;
  demo_mode: boolean;
};

export function assetUrl(path?: string | null) {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${API_URL}${path}`;
}

export function photoDownloadUrl(photoId: string) {
  return `${API_URL}/public/photos/${photoId}/download`;
}

export function matchZipDownloadUrl(matchSessionId: string, photoIds: string[]) {
  const params = new URLSearchParams();
  if (photoIds.length) params.set("photo_ids", photoIds.join(","));
  return `${API_URL}/public/matches/${matchSessionId}/download-zip?${params.toString()}`;
}

function formatApiError(data: unknown): string {
  if (!data || typeof data !== "object") return "Something went wrong";

  const detail = "detail" in data ? (data as { detail?: unknown }).detail : data;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          const message = String((item as { msg: unknown }).msg);
          const location = "loc" in item && Array.isArray((item as { loc?: unknown }).loc)
            ? (item as { loc: unknown[] }).loc.join(" ")
            : "";
          return location ? `${location}: ${message}` : message;
        }
        return JSON.stringify(item);
      })
      .join(", ");
  }

  if (detail && typeof detail === "object") {
    if ("message" in detail) return String((detail as { message: unknown }).message);
    return JSON.stringify(detail);
  }

  return "Something went wrong";
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("photo_finder_token") : null;
  const headers = new Headers(options.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(formatApiError(data));
  }
  return response.json();
}

export async function publicApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(formatApiError(data));
  }
  return response.json();
}
