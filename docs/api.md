# AGRIQUENE REST API & WebSocket Specification

Base URL: `http://localhost:8000/api`  
Interactive Swagger Docs: `http://localhost:8000/docs`

---

## 1. Authentication Endpoints

### `POST /api/auth/farmer/send-otp`
Sends a 6-digit OTP to the farmer's mobile number.
- **Request Body**:
  ```json
  { "mobile_number": "9876543210" }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "OTP sent successfully to +91 98******10",
    "mock_otp": "123456"
  }
  ```

### `POST /api/auth/farmer/verify-otp`
Verifies OTP and returns JWT Bearer token.
- **Request Body**:
  ```json
  { "mobile_number": "9876543210", "otp": "123456" }
  ```
- **Response**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user_id": 1,
    "full_name": "Ramesh Kumar Sharma",
    "role": "FARMER",
    "is_registered": true
  }
  ```

### `POST /api/auth/buyer/login` & `POST /api/auth/admin/login`
Authenticates Mandi Buyer / Centre Staff and System Administrators.

---

## 2. Farmer Endpoints

### `GET /api/farmers/profile`
Fetches authenticated farmer's KYC, bank account, and landholding.

### `POST /api/farmers/register`
Multi-step farmer profile registration.

### `GET /api/farmers/current-token`
Returns the active token details, real-time position, AI estimated wait, and departure advice.

### `GET /api/farmers/history` & `GET /api/farmers/payments`
Lists past procurement receipts, MSP amounts, and DBT transaction statuses.

---

## 3. Centre & Booking Endpoints

### `GET /api/centres`
Lists all Mandis with real-time waiting count, active counters, and distance.

### `GET /api/centres/{id}/slots`
Lists available time slots for a given centre and date with workload recommendation flags.

### `POST /api/bookings`
Books a procurement slot, allocates a sequential token number, and enqueues the farmer.

---

## 4. Queue & Real-Time Endpoints

### `GET /api/queue/{centre_id}`
Returns the live queue table, current serving token, and waiting farmers.

### `POST /api/queue/call-next`
Called by Mandi Staff to advance the queue, trigger position decrement, recalculate ETAs, and broadcast WebSockets.

### `POST /api/queue/{token_id}/arrived`
Marks the farmer as physically present at the mandi gate.

### `POST /api/queue/{token_id}/processing`
Marks the crop as currently on the weighbridge / moisture tester.

### `WebSocket /ws/queue/{centre_id}`
Real-time full duplex channel broadcasting `TOKEN_CALLED`, `NEW_BOOKING`, `PROCUREMENT_COMPLETED`, and `COUNTERS_UPDATED`.

---

## 5. Machine Learning ETA Endpoint

### `GET /api/eta/{token_id}`
Evaluates the XGBoost model to return high-precision wait time forecasts.
- **Response**:
  ```json
  {
    "token_id": 15,
    "token_number": 128,
    "token_display": "#128",
    "centre_id": 1,
    "centre_name": "Agri Procurement Centre – Ghaziabad Mandi",
    "queue_position": 14,
    "queue_length": 14,
    "active_counters": 4,
    "predicted_wait_minutes": 33,
    "expected_turn_time": "12:56 AM",
    "recommended_departure_time": "12:23 AM",
    "departure_advice": "Leave immediately (Your turn is approaching!)",
    "urgency": "high",
    "is_demo_prediction": false,
    "model_version": "XGBoost-v1.0",
    "confidence_score": 0.94,
    "updated_at": "00:23:38"
  }
  ```
