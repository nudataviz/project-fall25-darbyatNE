# PJM ECHO: A Visual Analytics App for Analyzing Electricity Market Prices
**CS7250 Semester Project** | **Team:** Ben Darby & Ben Henshaw

<div align="center">
  <img src="src/img/PJM_Map.png" alt="PJM LMP Map" width="600">
  <p><em>The interface allows users to visualize congestion deltas, filter historical data, retrieve summary information, and replay market days hour-by-hour.</em></p>
</div>

## Quick Start Guide
*Prerequisites: Node.js , npm, Conda and Git installed.*

**Clone, Install and Run the App:**
   ```bash
   git clone https://github.com/nudataviz/project-fall25-darbyatNE
   cd project-fall25-darbyatNE
   npm install
   npm run dev
   ```
---
## Documentation

### 1. [User Guide & Domain Logic](USER_GUIDE.md) 👈 *Start Here for Context*
*   **Key Terms:** What are PJM, LMP, DA/RT, and Congestion?
*   **How to Read the Map:** Interpreting color scales and timelines.
*   **Workflow:** How to use the Query Tool to find "Like Days."

### 2. [Technical Setup & Data Ingestion](SETUP.md) 👈 *Start Here for Building the Infrastructure*
*   **Database:** AWS RDS configuration and Schema.
*   **Hydration:** Running the Python scripts to ingest PJM data.
*   **Environment:** Setting up `.env` keys (PJM API, MapTiler, MYSQL credentials).
---
## Project Goal
**To help energy traders forecast financial risk.**

This tool allows users to select custom historical time periods enabling them to visualize prices across PJM's dual-settlement system, specifically focusing on the volatile price difference ("Congestion") between zones.

By comparing interregional zonal pricing using **Day-Ahead** settlement (The Plan) against **Real-Time** actuals (The Reality), users can identify costly bottlenecks and make data-driven decisions to identify financial opportunities.

---
## Feedback & Contact

Feedback and suggestions are welcome. Please send your thoughts to:

   **Ben Darby:** darby.b@northeastern.edu <br>  **Ben Henshaw:** henshaw.b@northeastern.edu