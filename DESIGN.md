---
name: MedSage AI
colors:
  background: "#ffffff"
  background-dark: "#050b14"
  surface: "rgba(255, 255, 255, 0.5)"
  surface-dark: "rgba(255, 255, 255, 0.05)"
  foreground: "#0f172a"
  foreground-dark: "#f8fafc"
  primary: "#3b82f6"
  accent: "#a855f7"
  border: "rgba(0, 0, 0, 0.05)"
  border-dark: "rgba(255, 255, 255, 0.1)"
typography:
  display-lg:
    fontFamily: InterVariable, sans-serif
    fontWeight: "600"
    letterSpacing: "-0.04em"
    lineHeight: "1.1"
  body-lg:
    fontFamily: InterVariable, sans-serif
    fontSize: "20px"
    fontWeight: "500"
    letterSpacing: "-0.015em"
    lineHeight: "1.6"
  label-sm:
    fontFamily: InterVariable, sans-serif
    fontSize: "14px"
    fontWeight: "500"
    letterSpacing: "0.01em"
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  unit: "8px"
  container-padding: "32px"
  section-margin: "80px"
components:
  pill:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.full}"
    border: "1px solid {colors.border}"
  button-primary:
    backgroundColor: "#111827"
    textColor: "#ffffff"
    rounded: "{rounded.full}"
    height: "56px"
  button-primary-dark:
    backgroundColor: "#ffffff"
    textColor: "#111827"
    rounded: "{rounded.full}"
    height: "56px"
---

## Brand & Style
MedSage AI embraces a modern, high-tech, and clinical aesthetic that bridges the gap between cutting-edge artificial intelligence and professional medical assistance. The design system is engineered to feel both infinitely powerful and completely approachable.

The UI leverages a "clean intelligence" approach. It features dynamic, WebGL-inspired animated mesh gradients (mixing deep blues and purples) that represent neural networks and computational thought. These colorful elements are placed far in the background, masked behind sleek, frosted-glass interfaces, creating a sense of depth without overwhelming the clinical clarity required for medical tools. The emotional response is intended to be one of trust, clarity, and breakthrough innovation.

## Colors
The color palette relies on stark, high-contrast foundations (black and white) paired with vibrant, fluid accent colors that signify "AI processing."

- **Foundation:** Pure White (`#ffffff`) for light mode backgrounds to convey clinical sterility, and deep space black (`#050b14`) for dark mode to reduce eye strain for medical professionals working long hours.
- **The Intelligence Gradients:** A fluid combination of vivid Blue (`#3b82f6`) and Purple (`#a855f7`). These colors are rarely used as solid fills. Instead, they are applied as animated, blurred radial gradients or text-clip gradients.
- **Surface Alpha (Glass):** UI containers use translucent layers (`rgba(255, 255, 255, 0.5)` in light mode, `rgba(255, 255, 255, 0.05)` in dark mode) to simulate floating glass panels.
- **Text:** High contrast slates (`#0f172a`) in light mode and off-whites (`#f8fafc`) in dark mode.

## Typography
The system utilizes **InterVariable** to provide a neutral, highly legible geometric structure that grounds the ethereal background animations.

- **Hierarchy & Scale:** Display text uses massive scaling (up to 8xl) with extremely tight letter-spacing (`-0.04em`) and line-heights (`1.1`) to create dense, impactful headline blocks.
- **Body & Labels:** Body text is sized generously (18px - 20px) with medium font weights (`500`) and a slight tracking reduction to maintain a premium editorial feel.
- **Special Treatments:** Key words in headlines ("Amplified") are highlighted using vibrant gradient-clipped text fills over a subtle, blurred glowing backdrop.

## Layout & Spacing
Layouts are expansive and focused, drawing the user's attention to central, interactive elements while allowing the animated backgrounds space to breathe.

- **Centric Alignment:** The primary landing experience relies on strict vertical centering and horizontal symmetry.
- **Grid Patterns:** A subtle underlying grid pattern (linear gradients creating a 48px mesh) anchors the floating organic shapes, merging structured engineering with fluid AI.
- **Negative Space:** Elements are given generous breathing room, utilizing substantial margins (e.g., 80px section spacing) to prevent cognitive overload.

## Elevation & Depth
Depth is created through light refraction, motion, and layering rather than traditional drop shadows.

- **Layer 0 (The Void):** The static base color (White or Deep Black) layered with a subtle engineering grid.
- **Layer 1 (The Mind):** Slowly orbiting, highly blurred (`100px` blur) colorful radial gradients (Blues and Purples) that follow the user's cursor or orbit autonomously.
- **Layer 2 (The Interface):** Frosted glass elements (`backdrop-blur-xl`) with delicate, semi-transparent borders (`ring-1 ring-black/5`) that catch the light of the layers below.
- **Shadows:** Drop shadows are minimal and diffuse (`0 4px 14px 0 rgba(0,0,0,0.1)`), used strictly to lift interactive elements like buttons off the glass canvas.

## Shapes
The shape language combines friendly, organic curves with structured data containers.

- **Action Elements:** Buttons and "Hero Pills" (notification badges) utilize fully rounded caps (`9999px`) to create tactile, inviting touch targets.
- **Cards & Modals:** Data containers use a standard `10px` (`0.625rem`) border radius, providing a professional, slightly sharpened edge suitable for medical interfaces.
- **Micro-interactions:** Icons inside interactive elements (like the Sparkle icon) utilize gentle pulse animations, and buttons feature fluid scaling on hover (`scale-105`) to feel responsive and alive.
