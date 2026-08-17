---
name: Civic Sentinel
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#44474e'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#74777f'
  outline-variant: '#c4c6cf'
  surface-tint: '#465f88'
  primary: '#002046'
  on-primary: '#ffffff'
  primary-container: '#1b365d'
  on-primary-container: '#87a0cd'
  inverse-primary: '#aec7f7'
  secondary: '#1b6d24'
  on-secondary: '#ffffff'
  secondary-container: '#a0f399'
  on-secondary-container: '#217128'
  tertiary: '#3c1600'
  on-tertiary: '#ffffff'
  tertiary-container: '#5d2600'
  on-tertiary-container: '#ff7816'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d6e3ff'
  primary-fixed-dim: '#aec7f7'
  on-primary-fixed: '#001b3d'
  on-primary-fixed-variant: '#2e476f'
  secondary-fixed: '#a3f69c'
  secondary-fixed-dim: '#88d982'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005312'
  tertiary-fixed: '#ffdbca'
  tertiary-fixed-dim: '#ffb68f'
  on-tertiary-fixed: '#331200'
  on-tertiary-fixed-variant: '#773200'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  data-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-padding: 24px
  gutter: 16px
  table-row-height: 40px
  input-height: 36px
---

## Brand & Style

The design system is engineered for high-stakes operational environments where clarity, authority, and rapid information processing are paramount. The brand personality is institutional and resolute, designed to instill confidence in government operators managing public safety and logistics.

The aesthetic follows a **Corporate / Modern** approach with a heavy emphasis on **Functional Minimalism**. Every interface element must serve a purpose; decorative flourishes are eliminated in favor of data density and legibility. The style utilizes a white-themed, high-contrast palette to ensure accessibility under various lighting conditions in command centers. Subtle depth is used not for ornament, but to establish a clear hierarchy between the map-based background layers and the actionable control overlays.

## Colors

The palette is anchored by **Police Blue**, signaling authority and stability. Semantic colors are strictly reserved for status indications to prevent visual noise:

*   **Primary (Police Blue):** Used for navigation, primary actions, and institutional branding.
*   **Success (Safety Green):** Indicates "Clear" traffic flow, "Available" units, or successful system overrides.
*   **Warning (Alert Orange):** Denotes "Congestion," "Low Battery," or "Delayed Response."
*   **Danger (Critical Red):** Reserved for "Accidents," "Emergency Deployments," and "System Failures."
*   **Neutrals:** A sophisticated range of cool greys (Slate) is used to create contrast between the background surfaces (#F8FAFC) and structural borders (#E2E8F0).

## Typography

This design system utilizes **Inter** exclusively for its exceptional legibility in data-heavy environments. The typeface’s tall x-height and neutral personality ensure that complex coordinates and unit IDs remain readable at small sizes.

For dashboards, the `data-tabular` role is critical; it must be implemented with tabular (monospaced) numbers to ensure that columns of figures align perfectly for quick scanning. `Label-caps` is used for category headers and non-interactive metadata to differentiate from actionable body text.

## Layout & Spacing

The design system employs a **Fixed Grid** philosophy for dashboard layouts to maintain predictable data positioning. A 12-column grid is used for the main workspace, while the sidebar—dedicated to unit lists and alerts—is fixed at 320px.

A 4px baseline shift ensures that all components align to a rigorous rhythm. Density is high; vertical padding in tables and lists is minimized to maximize the "at-a-glance" information volume. On mobile/tablet views for field officers, the layout collapses into a single-column stack, and touch targets increase from the desktop 32px to 44px.

## Elevation & Depth

To maintain a "Flat Modern" aesthetic while ensuring usability, the design system uses **Tonal Layers** combined with **Precision Shadows**:

1.  **Level 0 (Base):** The map or primary workspace (#F8FAFC).
2.  **Level 1 (Card/Surface):** White containers with a 1px border (#E2E8F0) to define areas.
3.  **Level 2 (Overlays/Popovers):** Subtle, tight shadows (0px 2px 4px rgba(0,0,0,0.05)) used for tooltips or map marker details.
4.  **Level 3 (Emergency Modals):** High-contrast shadows (0px 10px 15px rgba(0,0,0,0.1)) to draw focus to critical manual overrides or system alerts.

## Shapes

The design system uses a **Soft** shape language. Sharp corners are avoided to reduce visual "harshness," but large radii are rejected to maintain a professional, institutional feel.

*   **Buttons & Inputs:** 4px (0.25rem) radius for a precise, technical look.
*   **Cards & Panels:** 8px (0.5rem) radius to define major layout sections.
*   **Status Badges:** Fully rounded (pill) to distinguish them from interactive buttons.

## Components

### High-Density Data Tables
Tables are the core of the dashboard. Use zebra-striping (alternating #F8FAFC and #FFFFFF) to guide the eye. Header cells should have a subtle bottom border in Primary Blue. Row heights should be kept to 40px for maximum density.

### Interactive Map Markers
Markers use the Primary Blue for standard units and semantic colors (Orange/Red) for incidents. Use a "pin" shape with a white interior icon. When selected, the marker should scale by 1.2x and gain a Level 2 shadow.

### Risk Score Badges
Badges are used to quantify threat levels. They use a light background (10% opacity of the semantic color) with a dark, bold text of the same color (e.g., Critical Red text on a faint red background).

### Action Buttons
*   **Manual Override:** A primary-style button but with a distinctive outline or "Danger Red" background if the action is destructive. 
*   **Standard Actions:** "Police Blue" background with white text, using the `label-caps` typography style for clarity.
*   **Ghost Buttons:** Used for secondary filtering to keep the UI clean.

### Input Fields
Inputs must have a clearly defined 1px border. The focus state uses a 2px "Police Blue" ring with a 2px offset to ensure the cursor is clearly visible in high-pressure scenarios.