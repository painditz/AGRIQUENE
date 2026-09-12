# AGRIQUENE Machine Learning ETA Architecture
## XGBoost Regressor for Mandi Procurement Queue Forecasting

### 1. Problem Formulation
Traditional queue systems calculate simple linear waiting time:
$$\text{Wait} = \frac{\text{Position} \times \text{Avg Service Time}}{\text{Active Counters}}$$

However, in agricultural procurement centres (APMCs/Mandis), actual service times exhibit strong non-linear variance due to:
1. **Crop Inspection Overhead**: Crops like Paddy and Cotton require moisture testing and probe sampling, taking 25-40% longer than Wheat or Mustard.
2. **Weighbridge Bottlenecks**: Large truckloads (>60 quintals) incur non-linear unloading and tare-weighing delays.
3. **Diurnal Rush Dynamics**: Peak farmer arrivals between 10:00 AM and 1:00 PM cause queue compounding.
4. **Counter Disruption**: Shifts, manual paperwork delays, and counter downtime.

---

### 2. Feature Vector
The trained XGBoost Regressor uses the following input features:

| Feature Name | Type | Description | Importance |
|---|---|---|---|
| `token_position` | Integer | Absolute position of farmer in active waiting list | **45.64%** |
| `active_counters` | Integer | Number of operational weighbridge/verification counters | **32.14%** |
| `queue_length` | Integer | Total farmers currently queued at the Mandi | **8.91%** |
| `crop_factor` | Float | Moisture testing multiplier based on crop type | **5.16%** |
| `avg_processing_time_min`| Float | Rolling average inspection time per counter | **4.05%** |
| `hour_of_day` | Integer | 24-hr time indicating peak mandi arrival rush | **1.50%** |
| `day_of_week` | Integer | Day index (0=Mon, 6=Sun) reflecting weekly harvest cycles | **1.11%** |
| `historical_avg_wait_min`| Float | 30-day historical mean wait time for this centre | **0.55%** |
| `centre_workload_pct` | Float | Ratio of today's bookings to total centre capacity | **0.52%** |
| `quantity_quintals` | Float | Total estimated volume of crop produce | **0.42%** |

---

### 3. Model Architecture & Hyperparameters
- **Algorithm**: `xgboost.XGBRegressor`
- **Objective**: `reg:squarederror`
- **Number of Estimators**: 200
- **Max Tree Depth**: 5
- **Learning Rate ($\eta$)**: 0.05
- **Subsample Ratio**: 0.85
- **Column Sample by Tree**: 0.85
- **Tree Method**: `hist` (high-throughput histogram-based splitting)

---

### 4. Empirical Evaluation Results
- **Training Samples**: 6,400 realistic Mandi queue transitions
- **Test Samples**: 1,600 unseen transitions
- **Mean Absolute Error (MAE)**: **3.73 minutes**
- **Root Mean Squared Error (RMSE)**: **5.97 minutes**
- **Coefficient of Determination ($R^2$)**: **0.9905**
- **Accuracy within $\pm 5$ min**: **84.2%**
- **Accuracy within $\pm 10$ min**: **96.8%**

---

### 5. Departure Advisory Formulation ("When Should I Leave?")
The departure advisor computes the optimal transit departure time $T_{\text{depart}}$:
$$T_{\text{turn}} = T_{\text{now}} + \text{ETA}_{\text{XGBoost}}$$
$$T_{\text{depart}} = T_{\text{turn}} - (T_{\text{travel}} + T_{\text{buffer}})$$
Where $T_{\text{buffer}} = 15 \text{ minutes}$ prevents missed turns due to rapid queue acceleration.
