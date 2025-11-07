# CS7250 Project Proposal: 

### Title: Visualizing Historical Electricity Prices to Gain Market Insights

**Story:**  Allows users to visualize targeted market price data by zone to make price forecasts and get immediate answers to business questions like:

"What was our real-time price exposure during peak hours last month?"
"Are we consistently seeing price spikes on weekday mornings?"
"How did the Day-Ahead forecast compare to reality during the recent heatwave?"



---

## Team

| Role | Name |
| :--- | :--- |
| **Team Lead** | Ben Darby |
| **Chief Technology Officer** | Ben Henshaw |

**Repository:** [https://github.com/nudataviz/project-fall25-darbyatNE](https://github.com/nudataviz/project-fall25-darbyatNE)

---

##  Data & Analysis

## Data Sources and Features

The analytical framework will be constructed using a curated set of publicly available time-series and geospatial data. A core principle of feature selection is the requirement that all predictive data must be available prior to market clearing, mirroring the real-world decision-making environment.

The primary data sources are categorized as follows:

*   **Market Data:** Historical *Locational Marginal Prices (LMPs)* for each PJM zone will serve as the target variable for the analysis. Predictive features may include forward-looking fuel prices, primarily *natural gas spot prices*, which are a key driver of marginal generation costs.

*   **System Operations Data:** PJM-published data, including day-ahead load forecasts and scheduled generation and transmission outages, will be critical inputs. This data provides direct insight into anticipated system stress and resource availability.

*   **Weather Data:** Weather forecasts (e.g., temperature, wind speed, cloud cover) from sources such as the *National Oceanic and Atmospheric Administration (NOAA)* will be integrated to model their impact on electricity demand and renewable energy output.

*   **Geospatial Data:** The geometric boundaries of PJM zones, provided in `WKT` format, will be used to map and analyze price separation and congestion patterns between specific zonal pairs.

### Project Scope and Extensions

The initial scope of the project will focus on the relationship between these predictive features and day-ahead LMPs within the PJM system.

A potential extension for future work would be to expand the analytical model to incorporate a neighboring Independent System Operator (ISO), such as **MISO** or **NYISO**. This would allow for the analysis of inter-regional price dynamics and the economic impacts of congestion at the seams between balancing authorities.


### Data Sources

| Source | Description & Notes |
| :--- | :--- |
| [**PJM Dataminer 2**](https://dataminer2.pjm.com/list) | Primary source for PJM market and operations data, including LMPs, load forecasts, and outage schedules. |
| [**Visual Crossing Weather**](https://www.visualcrossing.com/weather-query-builder/) | Source for historical and forecast meteorological data, such as temperature, wind speed, and cloud cover. |
| [**Henry Hub Spot Price**](https://www.eia.gov/dnav/ng/hist/rngwhhd.htm) | U.S. EIA data for natural gas spot prices, a key input for marginal generation cost. |
| [**PJM**](https://pjm.com/library/maps/pjm-zones.aspx) | Source for geospatial data, including the geometric boundaries of PJM zones. |
| [**Esri / ArcGIS**](https://www.arcgis.com/apps/mapviewer/index.html) | Provides foundational geospatial base layers (e.g., satellite, topography, political boundaries) and infrastructure data for mapping and visualization. |


