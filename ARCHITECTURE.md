# Frontend Architecture: Kafka Nexus Hub

## Overview
This document outlines the architectural decisions and implementation details for the **Kafka Nexus Hub** frontend, specifically focusing on the **Clusters Topology Visualization**.

## Clusters Topology Visualization

The Clusters page (`/clusters`) provides a real-time, visual representation of the transaction integration flow:
`Source Clusters` -> `Integrator Service` -> `Destination Cluster`

### Core Components

1.  **`Clusters.tsx`**: The main page component that orchestrates data fetching and state management.
2.  **`TopologyOverlay.tsx`**: A dedicated SVG layer responsible for drawing connection lines and animating data particles.
3.  **`ClusterCard.tsx`**: Reusable component for displaying Source and Destination cluster metrics.
4.  **`IntegratorNode.tsx`**: Central component displaying the Integrator Service status.

### Technical Implementation

#### 1. Ref-Based Positioning System
To ensure perfect alignment of connection lines regardless of screen size or grid layout, we utilize a **Reference-Based Positioning System**:

*   **Callback Refs**: Instead of standard `useRef`, we use `useState` (Callback Refs) to capture the exact DOM elements (`HTMLDivElement`) of the Source, Integrator, and Destination nodes as soon as they mount.
*   **Reactive Updates**: The `TopologyOverlay` receives these DOM nodes as props. It uses `getBoundingClientRect()` to calculate the exact center coordinates of each node relative to the container.
*   **Event Listeners**: The system listens for `resize` and `scroll` events to recalculate paths instantly if the layout shifts.

#### 2. SVG Topology Overlay
The connections are rendered using a full-screen SVG overlay (`z-index: 0`) sitting behind the cards (`z-index: 10`).

*   **Cubic Bezier Curves**: Connections from Source to Integrator use cubic bezier curves (`C`) to create smooth, organic flow lines.
*   **Linear Paths**: The connection from Integrator to Destination uses a straight line (`L`) to indicate the final output flow.
*   **Coordinate System**: All coordinates are calculated in pixels based on the current viewport, ensuring high precision.

#### 3. Activity-Based Animation
To provide meaningful visual feedback, the data flow animations are **Activity-Driven**:

*   **Delta Detection**: The system tracks the *previous* message count for each cluster using `useRef`.
*   **Comparison Logic**: On each data fetch (every 5s), it compares `Current Count` vs `Previous Count`.
*   **Conditional Rendering**:
    *   **Delta > 0**: The particle opacity is set to `1` (Visible), indicating active data transfer.
    *   **Delta == 0**: The particle opacity is set to `0` (Invisible), indicating an idle connection.
*   **SMIL Animations**: We use native SVG `<animateMotion>` for smooth, high-performance particle movement along the calculated paths.

### State Management

*   **`sourceClusters`**: Array of cluster configurations and metrics fetched from the API.
*   **`destinationCluster`**: Configuration for the destination cluster.
*   **`activeSources`**: A `Set<number>` containing the indices of source clusters that have active data flow.
*   **`isDestActive`**: Boolean flag indicating if the destination cluster is receiving data.

## API Integration

The frontend consumes the Sidecar API:
*   `GET /config`: Retrieves the static topology configuration (Sources, Topics, Destination).
*   `GET /health/check`: Retrieves real-time metrics (Broker status, Message counts).

## Testing Strategy

*   **Cypress E2E**: Automated tests verify the presence of topology elements, correct rendering of SVG lines, and the visibility of topic details.
