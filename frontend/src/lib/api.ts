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
  distance_km: number;
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

class ApiClient {
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("agriquene_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Network request failed" }));
      throw new Error(errorData.detail || `Error: ${res.status}`);
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
  async getCentres(district?: string, state?: string): Promise<CentreItem[]> {
    const query = district ? `?district=${encodeURIComponent(district)}` : "";
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

  // Queue
  async getCentreQueue(centreId: number): Promise<CentreQueueStatus> {
    return this.request<CentreQueueStatus>(`/queue/${centreId}`);
  }

  async callNextToken(data: { token_id?: number; counter_number: number }, centreId: number = 1): Promise<any> {
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

  // ETA
  async getETA(tokenId: number): Promise<ETAPrediction> {
    return this.request<ETAPrediction>(`/eta/${tokenId}`);
  }

  // Buyer
  async getBuyerDashboard(centreId: number = 1): Promise<any> {
    return this.request(`/buyers/dashboard?centre_id=${centreId}`);
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

  async getAnalyticsOverview(): Promise<any> {
    return this.request("/analytics/overview");
  }

  async getMLMetrics(): Promise<any> {
    return this.request("/analytics/ml-metrics");
  }
}

export const api = new ApiClient();
