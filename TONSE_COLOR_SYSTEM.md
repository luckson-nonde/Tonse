# TONSE Complete Color System

Based on the codebase analysis of the TONSE application (specifically the dashboard and UI components), here is the extracted color palette and component color system.

## CSS Custom Properties

```css
:root {
  /* ==========================================================================
     SECTION 1 — GLOBAL SURFACE COLORS
     ========================================================================== */
  
  /* Primary page background (slate-50) */
  --tonse-page-bg: #f8fafc; /* RGB: 248, 250, 252 | Opacity: 100% */
  
  /* Sidebar / navigation background (white) */
  --tonse-nav-bg: #ffffff; /* RGB: 255, 255, 255 */
  
  /* Top navigation bar background (white) */
  --tonse-topbar-bg: #ffffff; /* RGB: 255, 255, 255 */
  
  /* Divider / separator lines (slate-100 & slate-200) */
  --tonse-divider-light: #f1f5f9; /* Opacity: 100% */
  --tonse-divider-dark: #e2e8f0; /* Opacity: 100% */

  /* ==========================================================================
     SECTION 2 — HERO BANNER COMPONENT (Virtual Account Card)
     ========================================================================== */
  
  /* Hero banner background (slate-800) */
  --tonse-hero-bg: #1e293b; /* RGB: 30, 41, 59 */
  
  /* Hero banner gradient overlay */
  --tonse-hero-gradient-start: rgba(201, 151, 58, 0.2); /* #C9973A at 20% */
  --tonse-hero-gradient-end: transparent;
  
  /* Hero banner primary text color (white) */
  --tonse-hero-text-primary: #ffffff;
  
  /* Hero banner secondary / subtext color (slate-400) */
  --tonse-hero-text-secondary: #94a3b8;
  
  /* Hero banner CTA button */
  --tonse-hero-cta-border: #C9973A;
  --tonse-hero-cta-text: #C9973A;
  --tonse-hero-cta-bg: transparent;
  --tonse-hero-cta-radius: 8px;
  
  /* Hero banner label text */
  --tonse-hero-label-text: #C9973A; /* Font size: 11px, Style: uppercase, tracking-wider */

  /* ==========================================================================
     SECTION 3 — STAT CARDS / METRIC CARDS
     ========================================================================== */
  
  /* Card background (white) */
  --tonse-card-bg: #ffffff; /* RGB: 255, 255, 255 */
  
  /* Card border color (slate-100) */
  --tonse-card-border: #f1f5f9;
  
  /* Card border radius */
  --tonse-card-radius: 24px; /* 1.5rem / 3xl */
  
  /* Card box shadow (shadow-sm) */
  --tonse-card-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
  
  /* Card icon colors */
  --tonse-card-icon-gold: #d49b35;
  --tonse-card-icon-emerald: #059669;
  
  /* Card label text color (slate-400) */
  --tonse-card-label-text: #94a3b8; /* Size: 10px, Style: uppercase, tracking-widest */
  
  /* Card metric / number color (slate-900 or gold) */
  --tonse-card-metric-dark: #0f172a;
  --tonse-card-metric-gold: #d49b35;
  
  /* Card subtext / helper text color (slate-500) */
  --tonse-card-subtext: #64748b;

  /* ==========================================================================
     SECTION 4 — ACCENT AND BRAND COLORS
     ========================================================================== */
  
  /* Gold accent (Primary Brand Color) 
     Appears on: Primary buttons, active icons, active nav states, metric highlights, 
     borders for active inputs, and status badges. */
  --tonse-accent-gold: #d49b35; /* RGB: 212, 155, 53 | Opacity: 100% */
  --tonse-accent-gold-dark: #C9973A; /* RGB: 201, 151, 58 | Used in Hero/Account card */
  --tonse-accent-gold-light: #fdf6e9; /* Used for icon backgrounds and active nav items */
  --tonse-accent-gold-warm: #fffaf5; /* Used for highlighted card backgrounds */
  
  /* Navy brand color (slate-800 / slate-900) */
  --tonse-brand-navy: #1e293b; /* RGB: 30, 41, 59 */
  --tonse-brand-navy-dark: #0f172a; /* RGB: 15, 23, 42 */
  
  /* Secondary accent colors */
  --tonse-accent-success: #059669; /* Emerald-600 */
  --tonse-accent-success-light: #ecfdf5; /* Emerald-50 */
  --tonse-accent-error: #f43f5e; /* Rose-500 */
  --tonse-accent-error-light: #fff1f2; /* Rose-50 */

  /* ==========================================================================
     SECTION 5 — TYPOGRAPHY COLORS
     ========================================================================== */
  
  /* Primary heading color (slate-900) */
  --tonse-text-heading: #0f172a;
  
  /* Section label color (slate-400) */
  --tonse-text-label: #94a3b8; /* Uppercase, letter-spaced (tracking-widest) */
  
  /* Body text color (slate-600) */
  --tonse-text-body: #475569;
  
  /* Muted / disabled text color (slate-400 / slate-500) */
  --tonse-text-muted: #94a3b8;
  
  /* Navigation item active state color */
  --tonse-text-nav-active: #d49b35;
  
  /* Navigation item inactive state color (slate-500) */
  --tonse-text-nav-inactive: #64748b;

  /* ==========================================================================
     SECTION 6 — INTERACTIVE ELEMENTS
     ========================================================================== */
  
  /* Active nav indicator */
  --tonse-nav-indicator-bg: #fdf6e9; /* Background highlight */
  --tonse-nav-indicator-color: #d49b35; /* Text/Icon color */
  
  /* Icon default color (slate-400) */
  --tonse-icon-default: #94a3b8;
  
  /* Icon active color */
  --tonse-icon-active: #d49b35;
  
  /* Notification bell color (slate-500) */
  --tonse-icon-notification: #64748b;
  
  /* Avatar / profile circle background */
  --tonse-avatar-bg: #fdf6e9;
}
```

## Implementation Notes

1. **Typography Styles**: The TONSE design system heavily relies on specific typography treatments alongside colors. 
   - **Section Labels**: Use `text-[10px] font-bold uppercase tracking-widest` alongside `--tonse-text-label`.
   - **Headings**: Use `font-serif font-black` alongside `--tonse-text-heading`.
2. **Shadows**: The system uses very subtle shadows (`shadow-sm` in Tailwind) for cards, and heavier, colored shadows for primary buttons (e.g., `shadow-lg shadow-[#d49b35]/20`).
3. **Border Radii**: The UI is highly rounded, utilizing `16px` (`rounded-2xl`), `24px` (`rounded-3xl`), and fully rounded pills (`rounded-full`) for avatars and icons.
