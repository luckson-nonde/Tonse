# TONSE Mobile Onboarding Implementation

## 1. Concept
The onboarding flow is designed to provide a high-fidelity, mobile-first introduction to the TONSE platform. It uses a **split-pane layout** on mobile:
- **Top Pane:** A 55% height area displaying a hero image slider with a dark gradient overlay, providing visual impact.
- **Bottom Pane:** A 45% height area (rounded at the top) containing the slide title, description, progress indicators, and navigation controls.

## 2. Functionality
- **State Management:** Uses `useState` to track the `currentSlide` index.
- **Responsive Design:** Utilizes Tailwind CSS (`lg:hidden`) to ensure this component only renders on mobile devices.
- **Navigation:**
  - **Next/Back:** Updates `currentSlide` state, triggering `AnimatePresence` for smooth transitions.
  - **Finish/Skip:** Sets `localStorage.setItem('tonse_onboarded', 'true')` and navigates to `/login`.
- **Routing Integration:** `App.tsx` checks for the `tonse_onboarded` flag in `localStorage` and the device width to decide whether to redirect the user to `/onboarding` or the main application.

## 3. Implementation Details

### A. Onboarding Component (`/src/pages/Onboarding.tsx`)
This component manages the slider state and layout.

```tsx
// Navigation Logic
const handleFinish = () => {
  localStorage.setItem('tonse_onboarded', 'true');
  navigate('/login');
};

// Layout Structure
<div className="min-h-screen bg-[#fdfaf6] z-50 flex flex-col lg:hidden">
  {/* Top Half: Image Slider */}
  <div className="relative h-[55vh] w-full overflow-hidden bg-[#1e293b]">
    {/* ... Slider Content ... */}
  </div>

  {/* Bottom Half: Content & Controls */}
  <div className="flex-1 bg-[#fdfaf6] rounded-t-[32px] -mt-8 relative z-30 flex flex-col p-8 shadow-[0_-8px_30px_rgba(0,0,0,0.1)]">
    {/* ... Content & Navigation ... */}
  </div>
</div>
```

### B. Routing Logic (`/src/App.tsx`)
The `RootRedirect` function ensures new mobile users are directed to onboarding.

```tsx
function RootRedirect() {
  const { user, isLoading } = useAuth();
  const onboarded = localStorage.getItem('tonse_onboarded');
  
  if (isLoading) return <LoadingSpinner />;
  
  // Redirect to onboarding if not onboarded AND on mobile
  if (!onboarded && window.innerWidth < 1024) return <Navigate to="/onboarding" replace />;
  
  if (!user) return <Navigate to="/login" replace />;
  // ... rest of redirect logic
}
```

## 4. Troubleshooting Checklist
If the onboarding is not appearing:
1. **Clear LocalStorage:** Open browser DevTools, go to Application > Local Storage, and delete the `tonse_onboarded` key to force the onboarding to show again.
2. **Check Breakpoint:** Ensure your browser window width is less than `1024px` (the `lg` breakpoint).
3. **Verify Routing:** Ensure the route `/onboarding` is correctly defined in `App.tsx`.
4. **Check Console:** Look for any JavaScript errors in the browser console that might prevent the component from mounting.
