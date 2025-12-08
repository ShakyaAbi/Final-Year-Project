# MERLIN Lite - Project Feature Specification

**MERLIN Lite** (Monitoring, Evaluation, Reporting, Learning, and Impact Network) is a comprehensive tool designed for NGOs and development organizations to design, track, and analyze the impact of their interventions.

## 1. Executive Summary
The application serves as a centralized platform for Managing for Development Results (MfDR). It integrates **Logical Framework (Logframe)** design directly with **Indicator Tracking**, enforced by intelligent data entry validation and automated anomaly detection logic.

## 2. Core Modules & Capabilities

### A. Project Portfolio Management
*   **Lifecycle Management**: Manages the complete lifecycle of development interventions from Draft to Active implementation and Archival.
*   **Project Initialization**: Establishes core project metadata, including strategic timelines, automated reporting period calculations, and high-level strategic goals.
*   **Search & Retrieval**: Provides capability to filter the portfolio by status and query project details to locate specific interventions.
*   **Performance Aggregation**: Calculates and aggregates high-level KPIs—including budget utilization, time elapsed, and beneficiary reach—to provide an immediate snapshot of organizational health.

### B. The Logframe Builder (Theory of Change)
*   **Structural Design**: Maps the project's theory of change through a hierarchical data structure linking Goals, Outcomes, Outputs, and Activities.
*   **Causal Logic Mapping**: Enforces parent-child relationships between project components to ensure logical consistency in intervention design.
*   **Contextual Metadata**: Associates critical context—such as assumptions, risks, and verification methods—directly with specific logic nodes.
*   **Recursive Structure**: Supports indefinite nesting of components to accommodate complex, multi-level project designs.

### C. Indicator Management
*   **Metric Definition**: Defines precise measurement criteria using typed data (Number, Percentage, Currency, Categorical, Boolean) to ensure data consistency.
*   **Targeting & Baselines**: Establishes baseline values and performance targets to serve as reference points for progress calculation.
*   **Validation Rules**: Configures constraints (min/max thresholds, unit formatting, decimal precision) to enforce data quality at the point of definition.
*   **Versioning System**: Tracks the history of indicator definitions, allowing the system to manage changes in measurement criteria or targets without losing historical context.

### D. Data Entry & Verification
*   **Data Collection**: Facilitates the periodic capture of monitoring data against defined indicators.
*   **Evidence Attachment**: Links verification materials (files, documents) or external references to specific data points to create an audit trail for reported figures.
*   **Input Validation**: Automatically checks submitted values against defined constraints (e.g., min/max expected values) to prevent erroneous data entry.
*   **Hybrid Data Handling**: Processes both structured data (values) and unstructured evidence (attachments/notes) simultaneously.

### E. Analytics & Intelligence
*   **Performance Calculation**: Computes progress percentages by comparing actual values against defined targets and baselines.
*   **Predictive Forecasting**: Applies linear regression algorithms to historical data to project future performance trends and estimate target achievement probabilities.
*   **Anomaly Detection**:
    *   Applies statistical logic to identify data points that deviate significantly from expected patterns.
    *   Flags potential data quality issues or critical project risks for review.
*   **Trend Analysis**: Visualizes historical performance data to identify seasonal patterns or consistent trajectories.

### F. User System & Configuration
*   **Identity Management**: Manages user profiles, roles, and organizational associations.
*   **Alert Configuration**: Controls the distribution logic for system alerts, allowing users to define specific triggers for anomalies, deadlines, and activity updates.
*   **Activity Logging**: Records user actions and system events to provide an audit log of changes within the system.

## 3. Technical Highlights
*   **Architecture**: React 18 with TypeScript for type safety and component modularity.
*   **Data Visualization**: Recharts library for rendering complex data sets into interpretable visuals.
*   **State Management**: React Router v6 for handling application state and navigation context.
*   **Service Layer**: A robust `mockService.ts` layer that simulates backend logic, including data persistence, relationship management, and realistic data generation algorithms for trends and anomalies.
