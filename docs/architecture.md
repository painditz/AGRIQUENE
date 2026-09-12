# AGRIQUENE System Architecture Specification
## Smart Procurement Queue & AI ETA System (SIH 2026)

### 1. Architectural Vision
AGRIQUENE is designed to replace unpredictable physical queues at Indian Agricultural Produce Market Committees (APMCs / Mandis) with an intelligent, multi-tier queue orchestration and waiting-time forecasting engine.

```
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|                                                                                   |
|  [ Farmer Mobile PWA ]      [ Mandi Buyer Desk ]      [ State Admin Console ]     |
|   - Mobile-First UI          - Operations Cockpit       - State Telemetry         |
|   - Real-time Queue HUD      - Multi-Counter Controls   - Analytics (Recharts)    |
|   - XGBoost ETA Card         - Weight & Grade Inspector - Slot Capacity Policy    |
|   - Departure Advisory       - 1-Click Advance Token    - XGBoost Model Health    |
+----------------------------------------+------------------------------------------+
                                         | REST APIs & WebSockets
                                         v
+-----------------------------------------------------------------------------------+
|                              APPLICATION TIER (FastAPI)                          |
|                                                                                   |
|  [ Core Security & RBAC ]  <--->  [ Real-Time WebSocket Manager ]                 |
|   - JWT Token Manager              - Centre-Specific Live Channels (/ws/queue/{id})|
|   - OTP Verification Engine        - Multi-Client Broadcast Hub                   |
|                                                                                   |
|  [ Business Logic Modules ]                                                       |
|   - Queue Orchestrator (FIFO, Priority, Counter Allocation)                       |
|   - Slot Booking & Capacity Optimizer                                             |
|   - Procurement Record & MSP Calculator                                           |
|   - DBT / PFMS Payment Lifecycle Handler                                          |
|                                                                                   |
|  [ Integration Abstractions ]                                                     |
|   - SMSService (Direct Gov SMS dispatch & event logging)                         |
|   - NotificationService (In-app alerts)                                           |
|   - ETAPredictionService (Bridge to XGBoost ML Engine)                            |
+-------------------+--------------------+-------------------+----------------------+
                    |                    |                   |
                    v                    v                   v
+-----------------------+ +-----------------------+ +-------------------------------+
|     DATABASE TIER     | |       ML TIER         | |      NOTIFICATION LOGS        |
|  PostgreSQL / SQLite  | |  XGBoost Regressor    | |  Real-Time SMS Audit Trail    |
|  - Relational Schema  | |  - Queue dynamics     | |  - Token generation alerts    |
|  - ACID Transactions  | |  - Active counters    | |  - Turn approaching warnings  |
|  - Foreign Key Integrity| - Crop moisture factor| |  - Procurement receipt SMS    |
|  - Index Optimizations| |  - Non-linear delay   | |  - DBT payment credit notices |
+-----------------------+ +-----------------------+ +-------------------------------+
```

---

### 2. Real-Time WebSocket Data Flow
When a Mandi Procurement Officer / Buyer advances the queue:

1. **Buyer Action**: Officer clicks **"Call Next Token"** for Counter #1 on `/buyer/queue`.
2. **FastAPI Route**: `POST /api/queue/call-next` is invoked.
3. **Database Transaction**:
   - Token `#114` status updated to `PROCESSING`.
   - Token `#115` status updated to `CALLED`, `position = 0`.
   - All subsequent waiting tokens (`#116` to `#128`) have their `current_position` reduced by 1.
4. **ML Recalculation**: `ETAService` evaluates the XGBoost model for each active token.
5. **WebSocket Broadcast**: FastAPI `ConnectionManager` pushes a `TOKEN_CALLED` payload to `/ws/queue/1`.
6. **Farmer UI Synchronization**:
   - Ramesh Kumar's screen (Token `#128`) animates smoothly: Position `14` $\to$ `13`.
   - ETA adjusts: `36 min` $\to$ `33 min`.
   - "When Should I Leave?" departure countdown dynamically syncs.
7. **SMS Dispatch**: Farmer receives SMS: *"Queue update for #128: 13 farmers ahead. Est. wait: 33 min."*

---

### 3. Scalability & Resilience
- **Low-Bandwidth Optimization**: Lightweight SVG icons, compact JSON payloads, and SMS fallbacks ensure farmers in remote rural regions with 2G/3G connections remain informed.
- **Failover Strategy**: If the XGBoost model runtime is unavailable, the `AgriqueneETAPredictor` seamlessly defaults to an analytical $M/M/c$ queueing algorithm without dropping requests.
- **State Isolation**: Procurement centres operate independently; queue events are partitioned by `centre_id` so one mandi's load does not impact others.
