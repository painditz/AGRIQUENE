import { API_BASE_URL } from "./constants";

export interface SendOTPResponse {
  success: boolean;
  message: string;
  mock_otp?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: number;
  full_name: string;
  mobile_number: string;
  role: "FARMER" | "BUYER" | "ADMIN";
  is_registered: boolean;
  centre_id?: number;
  centre_name?: string;
}

export interface CentreItem {
  id: number;
  name: string;
  code: string;
  address: string;
  district: string;
  state: string;
  pin_code: string;
  latitude: number;
  longitude: number;
  contact_phone: string;
  capacity_per_day: number;
  active_counters: number;
  total_counters: number;
  avg_processing_time_min: number;
  workload_pct: number;
  open_time: string;
  close_time: string;
  status: "OPEN" | "BUSY" | "CLOSED" | "MAINTENANCE";
  current_waiting_count: number;
  estimated_wait_min: number;
  available_slots_today: number;
  distance_km?: number | null;
}

export interface CropItem {
  id: number;
  name: string;
  hindi_name?: string;
  msp_per_quintal: number;
  standard_moisture_pct: number;
  max_moisture_pct: number;
  grade_a_premium: number;
  season: string;
  is_active: boolean;
}

export interface SlotItem {
  id: number;
  centre_id: number;
  date: string;
  start_time: string;
  end_time: string;
  capacity: number;
  booked_count: number;
  available_count: number;
  is_recommended: boolean;
  is_active: boolean;
}

export interface TokenItem {
  id: number;
  token_number: number;
  token_display: string;
  booking_id: number;
  booking_reference: string;
  farmer_id: number;
  farmer_name: string;
  farmer_mobile: string;
  farmer_district: string;
  centre_id: number;
  centre_name: string;
  slot_id: number;
  slot_time: string;
  booking_date: string;
  crop_type: string;
  quantity_quintals: number;
  status: "WAITING" | "ARRIVED" | "CALLED" | "PROCESSING" | "COMPLETED" | "SKIPPED";
  current_position: number;
  initial_position: number;
  predicted_wait_minutes: number;
  expected_turn_time: string;
  recommended_departure_time: string;
  departure_advice: string;
  active_counters: number;
  created_at: string;
}

export interface QueueItem {
  token_id: number;
  token_number: number;
  token_display: string;
  farmer_name: string;
  farmer_mobile_masked: string;
  crop: string;
  quantity_quintals: number;
  slot_time: string;
  status: "WAITING" | "ARRIVED" | "CALLED" | "PROCESSING" | "COMPLETED" | "SKIPPED";
  position: number;
  estimated_wait_min: number;
  expected_turn_time: string;
  counter_assigned?: number;
}

export interface CentreQueueStatus {
  centre_id: number;
  centre_name: string;
  active_counters: number;
  total_waiting: number;
  total_completed_today: number;
  current_serving_token?: string;
  current_serving_id?: number;
  avg_processing_time_min: number;
  queue: QueueItem[];
  updated_at: string;
}

export interface ETAPrediction {
  token_id: number;
  token_number: number;
  token_display: string;
  centre_id: number;
  centre_name: string;
  queue_position: number;
  queue_length: number;
  active_counters: number;
  predicted_wait_minutes: number;
  expected_turn_time: string;
  recommended_departure_time: string;
  departure_advice: string;
  urgency: string;
  is_demo_prediction: boolean;
  model_version: string;
  confidence_score: number;
  updated_at: string;
}

export interface ProcurementItem {
  id: number;
  token_id: number;
  token_display: string;
  farmer_id: number;
  farmer_name: string;
  centre_name: string;
  crop_name: string;
  gross_weight_quintals: number;
  tare_weight_quintals: number;
  net_weight_quintals: number;
  moisture_pct: number;
  quality_grade: string;
  base_msp: number;
  bonus_amount: number;
  total_amount: number;
  receipt_number: string;
  status: string;
  verified_at: string;
  payment_status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  payment_transaction_ref?: string;
}

export interface PaymentItem {
  id: number;
  procurement_id: number;
  receipt_number: string;
  farmer_id: number;
  farmer_name: string;
  crop: string;
  net_weight_quintals: number;
  amount: number;
  transaction_ref: string;
  utr_number?: string;
  bank_account_masked: string;
  bank_name: string;
  payment_mode: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  initiated_at: string;
  completed_at?: string;
}

export interface SMSLogItem {
  id: number;
  mobile_number: string;
  message: string;
  trigger_event: string;
  status: string;
  sent_at: string;
}

export interface AuditLogItem {
  id: number;
  user_id?: number;
  user_name?: string;
  user_role?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("agriquene_token");
      if (token && token !== "undefined" && token !== "null" && token.trim() !== "") {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const primaryUrl = `${API_BASE_URL}${endpoint}`;
    
    // Determine alternate URL for loopback resiliency between localhost and 127.0.0.1
    let alternateUrl: string | null = null;
    if (primaryUrl.includes("localhost:8000")) {
      alternateUrl = primaryUrl.replace("localhost:8000", "127.0.0.1:8000");
    } else if (primaryUrl.includes("127.0.0.1:8000")) {
      alternateUrl = primaryUrl.replace("127.0.0.1:8000", "localhost:8000");
    }

    const headers = {
      ...this.getHeaders(),
      ...options.headers,
    };

    let res: Response;
    try {
      res = await fetch(primaryUrl, {
        ...options,
        headers,
      });
    } catch (netErr: any) {
      // If primary failed due to network / connection refusal, try alternate loopback host
      if (alternateUrl) {
        try {
          res = await fetch(alternateUrl, {
            ...options,
            headers,
          });
        } catch {
          throw new Error("Unable to connect to AGRIQUENE procurement service. Please ensure the backend is running at http://localhost:8000.");
        }
      } else {
        throw new Error("Unable to connect to AGRIQUENE procurement service. Please ensure the backend is running at http://localhost:8000.");
      }
    }

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: `Server responded with status ${res.status}` }));
      throw new Error(errorData.detail || `Server responded with error ${res.status}`);
    }

    return res.json();
  }

  // Auth
  async sendFarmerOTP(mobile_number: string): Promise<SendOTPResponse> {
    return this.request<SendOTPResponse>("/auth/farmer/send-otp", {
      method: "POST",
      body: JSON.stringify({ mobile_number }),
    });
  }

  async verifyFarmerOTP(mobile_number: string, otp: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/farmer/verify-otp", {
      method: "POST",
      body: JSON.stringify({ mobile_number, otp }),
    });
  }

  async loginBuyer(identifier: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/buyer/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
  }

  async loginAdmin(identifier: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/admin/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
  }

  // Farmer
  async getFarmerProfile(): Promise<any> {
    return this.request("/farmers/profile");
  }

  async registerFarmerProfile(data: any): Promise<any> {
    return this.request("/farmers/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getFarmerCurrentToken(): Promise<TokenItem | null> {
    return this.request<TokenItem | null>("/farmers/current-token");
  }

  async getFarmerHistory(): Promise<ProcurementItem[]> {
    return this.request<ProcurementItem[]>("/farmers/history");
  }

  async getFarmerPayments(): Promise<PaymentItem[]> {
    return this.request<PaymentItem[]>("/farmers/payments");
  }

  // Centres & Slots
  async getCentres(district?: string, state?: string, lat?: number, lng?: number): Promise<CentreItem[]> {
    const params = new URLSearchParams();
    if (district) params.append("district", district);
    if (state) params.append("state", state);
    if (lat !== undefined && lat !== null) params.append("lat", lat.toString());
    if (lng !== undefined && lng !== null) params.append("lng", lng.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return this.request<CentreItem[]>(`/centres${query}`);
  }

  async getCentreDetail(id: number): Promise<CentreItem> {
    return this.request<CentreItem>(`/centres/${id}`);
  }

  async getCentreSlots(centreId: number, date?: string): Promise<SlotItem[]> {
    const query = date ? `?date=${encodeURIComponent(date)}` : "";
    return this.request<SlotItem[]>(`/centres/${centreId}/slots${query}`);
  }

  async createBooking(data: {
    centre_id: number;
    slot_id: number;
    crop_type: string;
    estimated_quantity_quintals: number;
    season?: string;
  }): Promise<TokenItem> {
    return this.request<TokenItem>("/bookings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Crops Master
  async getCrops(): Promise<CropItem[]> {
    return this.request<CropItem[]>("/crops");
  }

  async getCropById(id: number): Promise<CropItem> {
    return this.request<CropItem>(`/crops/${id}`);
  }

  // Queue
  async getCentreQueue(centreId: number): Promise<CentreQueueStatus> {
    return this.request<CentreQueueStatus>(`/queue/${centreId}`);
  }

  async callNextToken(data: { token_id?: number; counter_number: number }, centreId: number): Promise<any> {
    return this.request(`/queue/call-next?centre_id=${centreId}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async markFarmerArrived(tokenId: number): Promise<any> {
    return this.request(`/queue/${tokenId}/arrived`, { method: "POST" });
  }

  async startProcessingToken(tokenId: number): Promise<any> {
    return this.request(`/queue/${tokenId}/processing`, { method: "POST" });
  }

  async skipToken(tokenId: number): Promise<any> {
    return this.request(`/queue/${tokenId}/skip`, { method: "POST" });
  }

  async completeToken(tokenId: number): Promise<any> {
    return this.request(`/queue/${tokenId}/complete`, { method: "POST" });
  }

  // ETA
  async getETA(tokenId: number): Promise<ETAPrediction> {
    return this.request<ETAPrediction>(`/eta/${tokenId}`);
  }

  // Buyer
  async getBuyerDashboard(centreId?: number): Promise<any> {
    const query = centreId ? `?centre_id=${centreId}` : "";
    return this.request(`/buyers/dashboard${query}`);
  }

  async updateActiveCounters(centre_id: number, active_counters: number): Promise<any> {
    return this.request("/buyers/counters", {
      method: "PUT",
      body: JSON.stringify({ centre_id, active_counters }),
    });
  }

  // Procurement & Payment
  async submitProcurement(data: {
    token_id: number;
    gross_weight_quintals: number;
    tare_weight_quintals: number;
    moisture_pct: number;
    quality_grade: string;
    base_msp?: number;
    bonus_amount?: number;
    remarks?: string;
  }): Promise<ProcurementItem> {
    return this.request<ProcurementItem>("/procurement", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePaymentStatus(paymentId: number, status: string, utr_number?: string): Promise<PaymentItem> {
    return this.request<PaymentItem>(`/payments/${paymentId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, utr_number }),
    });
  }

  // Notifications & SMS
  async getNotifications(): Promise<any[]> {
    return this.request("/notifications");
  }

  async getSMSLogs(): Promise<SMSLogItem[]> {
    return this.request<SMSLogItem[]>("/notifications/sms/logs");
  }

  // Admin & Analytics
  async getAdminDashboard(): Promise<any> {
    return this.request("/admin/dashboard");
  }

  async getAdminFarmers(search?: string): Promise<any[]> {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return this.request(`/admin/farmers${query}`);
  }

  async getAdminBuyers(): Promise<any[]> {
    return this.request("/admin/buyers");
  }

  async unifiedLogin(data: { identifier: string; password?: string; otp?: string }): Promise<AuthResponse> {
    return this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getAuditLogs(action?: string, entity_type?: string, limit: number = 50): Promise<AuditLogItem[]> {
    const params = new URLSearchParams();
    if (action) params.append("action", action);
    if (entity_type) params.append("entity_type", entity_type);
    params.append("limit", limit.toString());
    return this.request<AuditLogItem[]>(`/admin/audit-logs?${params.toString()}`);
  }

  async getAdminTokens(params?: { centre_id?: number; status?: string; search?: string }): Promise<any[]> {
    const q = new URLSearchParams();
    if (params?.centre_id) q.append("centre_id", params.centre_id.toString());
    if (params?.status) q.append("status", params.status);
    if (params?.search) q.append("search", params.search);
    return this.request<any[]>(`/admin/tokens?${q.toString()}`);
  }

  async getAdminSlots(centre_id?: number, date?: string): Promise<any[]> {
    const q = new URLSearchParams();
    if (centre_id) q.append("centre_id", centre_id.toString());
    if (date) q.append("date", date);
    return this.request<any[]>(`/admin/slots?${q.toString()}`);
  }

  async createSlot(data: any): Promise<any> {
    return this.request("/admin/slots", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async createCentre(data: any): Promise<any> {
    return this.request("/admin/centres", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateCentre(centreId: number, data: any): Promise<any> {
    return this.request(`/admin/centres/${centreId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async getAnalyticsOverview(): Promise<any> {
    return this.request("/analytics/overview");
  }

  async getMLMetrics(): Promise<any> {
    return this.request("/analytics/ml-metrics");
  }
}

export const api = new ApiClient();
