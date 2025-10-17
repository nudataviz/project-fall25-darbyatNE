# Semester Project  
**Course:** CS7250       
**Term:**   Fall 2025 – Professor Bogden        
**Team:** Ben Darby & Ben Henshaw  

---

## Title: **It's Electric**  

---

### Topic  
Forecasting Electricity Prices by Zone using "like days"

---

### Repository Overview  
This repository contains all materials for our CS7250 semester project,
---

### Purpose  
This project's primary objective is to develop a visual analytical interface for energy market participants operating within the PJM Interconnection. The tool's core function is to identify historical analogs by analyzing a set of predictive features related to market prices. A critical constraint is that these features must be known prior to market clearing. The resulting insights will enable users to better forecast zonal Locational Marginal Prices (LMPs) and anticipate price separation between zones, thereby improving risk management and optimizing bidding strategies.
---

### Reproducibility
## Preview

<img src=".//src/img/zone_map.png" width="600" alt="PJM Zone Map">

<img src=".//src/img/pjm_mean_zonal.png" width="600" alt="PJM Mean Price by Zone">

## Challenges
The two largest technical challenges are as follows: 
 * Parsing the text values assigned to datetime_beginning_ept into values that can be compared numerically in selecting a date range. JavaScript's built-in Date object made quick work of turning text into comparable values. This was easy enough to do for dates themselves, but the next version of this graphic will be more granular in its measurement of time intervals, in that our plan is to represent this pricing data on an hourly basis, possibly with more interactive components such as a slider.
 * Adjusting the formatting for such dense data representations was required so that data labels weren't overlapping, but this was accomplished using lambda expressions for the `title` attribute, setting margins for the overall plot, adding an angle to the ordinal group labels along the x axis, and adding an inset to the bars themselves to keep them apart.

## Getting Started

Follow these instructions to clone the repository and run the application on your local machine.

### Prerequisites

Before you begin, ensure you have the following installed on your system:
- [Git](https://git-scm.com/)
- [Conda](https://docs.conda.io/en/latest/miniconda.html) (or Miniconda)

### Installation and Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/nudataviz/project-fall25-darbyatNE
    cd project-fall25-darbyatNE/hello-framework
    ```

2.  **Create and activate the Conda environment**
    The `framework.yml` file contains all necessary dependencies including Node.js, Yarn, and Python packages.
    ```bash
    conda env create -f framework.yml
    conda activate framework
    ```

3.  **Install JavaScript dependencies**
    Yarn will read the configuration from `.yarnrc.yml` and install dependencies to the `node_modules` directory.
    ```bash
    yarn install
    ```

4.  **Run the development server**
    ```bash
    yarn dev
    ```

5.  **View the application**
    Open your web browser and navigate to:
    ```
    http://localhost:3000
    ```

## Feedback

Feedback and suggestions are welcome! Please send your thoughts to:
**darby.b@northeastern.edu  henshaw.b@northeastern.edu**


### Where to Find More Information  
For a detailed overview of our project, please refer to the **[`proposal.md`](proposal.md)** document in this repository.

> Additional resources—such as datasets, code, and planning documents—will be added to their respective folders as the project progresses.

---

