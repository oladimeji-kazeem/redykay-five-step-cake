import { supabase } from "@/integrations/supabase/client";

export interface ThemeColors {
  primary: string;           // Main CTA buttons, highlighted titles, icons, focus rings
  primaryForeground: string; // Text on primary buttons (usually #FFFFFF)
  secondary: string;         // Light tint background for badges, chips, subtle banners
  secondaryForeground: string;
  background: string;        // Overall page background
  foreground: string;        // Body text and headings
  card: string;              // Cards, modals, elevated surfaces
  cardForeground: string;
  accent: string;            // Secondary accent
  accentForeground: string;
  border: string;            // Borders, cards, inputs
  muted: string;
  mutedForeground: string;
  radius: string;            // Corner radius, e.g. "1rem", "0.5rem", "1.5rem"
  bodyBackground?: string;   // Optional custom CSS gradient
}

export interface StudioTheme {
  id: string;                // e.g. "signature-berry", "rose-gold", "custom"
  name: string;
  tagline: string;
  isDark?: boolean;
  colors: ThemeColors;
  updated_at?: string;
  updated_by?: string;
}

export const THEME_PRESETS: StudioTheme[] = [
  {
    id: "signature-berry",
    name: "Royal Berry & Violet",
    tagline: "Signature Redycakes luxury palette — vibrant magenta-violet, warm cream backdrop & plum accents.",
    isDark: false,
    colors: {
      primary: "oklch(0.55 0.26 292)",
      primaryForeground: "#ffffff",
      secondary: "oklch(0.955 0.045 295)",
      secondaryForeground: "oklch(0.30 0.14 292)",
      background: "oklch(0.992 0.008 295)",
      foreground: "oklch(0.22 0.06 295)",
      card: "#ffffff",
      cardForeground: "oklch(0.22 0.06 295)",
      accent: "oklch(0.935 0.075 295)",
      accentForeground: "oklch(0.28 0.16 292)",
      border: "oklch(0.91 0.03 295)",
      muted: "oklch(0.965 0.02 295)",
      mutedForeground: "oklch(0.46 0.045 295)",
      radius: "1rem",
      bodyBackground: "linear-gradient(160deg, oklch(0.988 0.022 295) 0%, oklch(0.997 0.005 295) 45%, oklch(0.985 0.02 335) 100%)",
    },
  },
  {
    id: "rose-gold",
    name: "Rose Gold & Champagne",
    tagline: "Bespoke wedding elegance — warm shimmering rose-gold, soft petal cream & delicate apricot undertones.",
    isDark: false,
    colors: {
      primary: "#B76E79",
      primaryForeground: "#ffffff",
      secondary: "#FDF2F2",
      secondaryForeground: "#5C2830",
      background: "#FCF8F6",
      foreground: "#3A2227",
      card: "#ffffff",
      cardForeground: "#3A2227",
      accent: "#F8E6E6",
      accentForeground: "#5C2830",
      border: "#EEDAD9",
      muted: "#F7ECEB",
      mutedForeground: "#7A565C",
      radius: "1rem",
      bodyBackground: "linear-gradient(160deg, #FBF2EF 0%, #FCF8F6 50%, #F7EDE8 100%)",
    },
  },
  {
    id: "botanical-sage",
    name: "Botanical Sage & Forest",
    tagline: "Artisanal organic garden bakes — earthy eucalyptus green, matcha cream & deep slate foliage.",
    isDark: false,
    colors: {
      primary: "#3D6E49",
      primaryForeground: "#ffffff",
      secondary: "#ECF4EE",
      secondaryForeground: "#1B3E25",
      background: "#F8FAF8",
      foreground: "#1B2F21",
      card: "#ffffff",
      cardForeground: "#1B2F21",
      accent: "#DFECE1",
      accentForeground: "#1B3E25",
      border: "#CFDFD2",
      muted: "#EDF2EE",
      mutedForeground: "#556E5A",
      radius: "1rem",
      bodyBackground: "linear-gradient(160deg, #EFF6F1 0%, #F8FAF8 50%, #ECF3EE 100%)",
    },
  },
  {
    id: "velvet-cocoa",
    name: "Velvet Cocoa & Antique Gold",
    tagline: "Decadent patisserie couture — gilded warm gold primary, rich espresso text & cream praline base.",
    isDark: false,
    colors: {
      primary: "#B37D36",
      primaryForeground: "#ffffff",
      secondary: "#F8F3EA",
      secondaryForeground: "#422B18",
      background: "#FAF7F3",
      foreground: "#2D1D13",
      card: "#ffffff",
      cardForeground: "#2D1D13",
      accent: "#EFE6D6",
      accentForeground: "#422B18",
      border: "#E5D7C2",
      muted: "#F3ECE1",
      mutedForeground: "#725B48",
      radius: "1rem",
      bodyBackground: "linear-gradient(160deg, #F8F3EB 0%, #FAF7F3 50%, #F4ECE0 100%)",
    },
  },
  {
    id: "midnight-dark",
    name: "Midnight Luxury (Sleek Dark Mode)",
    tagline: "Evening gala noir — deep obsidian onyx, champagne gold accents & frosted charcoal glass cards.",
    isDark: true,
    colors: {
      primary: "#E5BE72",
      primaryForeground: "#141419",
      secondary: "#22222C",
      secondaryForeground: "#F7F2E8",
      background: "#111116",
      foreground: "#F4F4F7",
      card: "#181820",
      cardForeground: "#F4F4F7",
      accent: "#2A2937",
      accentForeground: "#E5BE72",
      border: "#2C2C3A",
      muted: "#1E1E28",
      mutedForeground: "#9A9AA8",
      radius: "1.25rem",
      bodyBackground: "linear-gradient(160deg, #0E0E13 0%, #13131A 50%, #16151E 100%)",
    },
  },
  {
    id: "coastal-mist",
    name: "Ocean Mist & Sea Salt",
    tagline: "Modern coastal serenity — refined Aegean slate blue, crisp sea-foam whites & navy ink typography.",
    isDark: false,
    colors: {
      primary: "#2C6DA6",
      primaryForeground: "#ffffff",
      secondary: "#ECF4FA",
      secondaryForeground: "#153A5B",
      background: "#F7FAFC",
      foreground: "#182635",
      card: "#ffffff",
      cardForeground: "#182635",
      accent: "#DBE9F4",
      accentForeground: "#153A5B",
      border: "#C8DCEB",
      muted: "#E8F0F7",
      mutedForeground: "#4C6B86",
      radius: "1rem",
      bodyBackground: "linear-gradient(160deg, #EDF4FA 0%, #F7FAFC 50%, #E8F1F8 100%)",
    },
  },
];

export const DEFAULT_STUDIO_THEME: StudioTheme = THEME_PRESETS[0];

const STORAGE_THEME_KEY = "redycakes_active_theme";
const BROADCAST_THEME_CHANNEL = "redycakes_theme_broadcast";

/**
 * Apply theme variables directly to DOM root and body
 */
export function applyThemeToDom(theme: StudioTheme): void {
  if (typeof document === "undefined") return;

  try {
    const root = document.documentElement;
    const { colors, isDark } = theme;

    root.style.setProperty("--primary", colors.primary);
    root.style.setProperty("--primary-foreground", colors.primaryForeground);
    root.style.setProperty("--secondary", colors.secondary);
    root.style.setProperty("--secondary-foreground", colors.secondaryForeground);
    root.style.setProperty("--background", colors.background);
    root.style.setProperty("--foreground", colors.foreground);
    root.style.setProperty("--card", colors.card);
    root.style.setProperty("--card-foreground", colors.cardForeground || colors.foreground);
    root.style.setProperty("--accent", colors.accent);
    root.style.setProperty("--accent-foreground", colors.accentForeground || colors.secondaryForeground);
    root.style.setProperty("--border", colors.border);
    root.style.setProperty("--input", colors.border);
    root.style.setProperty("--ring", colors.primary);
    root.style.setProperty("--radius", colors.radius);
    if (colors.muted) root.style.setProperty("--muted", colors.muted);
    if (colors.mutedForeground) root.style.setProperty("--muted-foreground", colors.mutedForeground);

    if (colors.bodyBackground) {
      document.body.style.background = colors.bodyBackground;
      document.body.style.backgroundAttachment = "fixed";
    } else {
      document.body.style.background = colors.background;
    }

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  } catch (err) {
    console.debug("[Theme] applyThemeToDom note:", err);
  }
}

/**
 * Retrieve active theme from local storage
 */
export function getLocalTheme(): StudioTheme {
  if (typeof window === "undefined") return DEFAULT_STUDIO_THEME;
  try {
    const raw = localStorage.getItem(STORAGE_THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.colors && parsed.colors.primary) {
        return parsed as StudioTheme;
      }
    }
  } catch {
    // Ignore fallback
  }
  return DEFAULT_STUDIO_THEME;
}

/**
 * Save theme to local storage
 */
export function saveLocalTheme(theme: StudioTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_THEME_KEY, JSON.stringify(theme));
  } catch (err) {
    console.debug("[Theme] Save local error:", err);
  }
}

/**
 * Broadcast theme update across browser tabs and components
 */
export function broadcastThemeUpdate(theme: StudioTheme): void {
  if (typeof window === "undefined") return;

  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel(BROADCAST_THEME_CHANNEL);
      channel.postMessage({ type: "theme_updated", theme, timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // Ignore
  }

  try {
    window.dispatchEvent(
      new CustomEvent("redycakes_theme_event", { detail: { theme, timestamp: Date.now() } })
    );
  } catch {
    // Ignore
  }
}

/**
 * Fetch active theme from Supabase with local fallback
 */
export async function fetchActiveTheme(): Promise<StudioTheme> {
  try {
    const { data, error } = await supabase
      .from("site_theme" as any)
      .select("*")
      .eq("id", "current_theme")
      .maybeSingle();

    if (!error && data && data.theme_data) {
      const remoteTheme = data.theme_data as StudioTheme;
      saveLocalTheme(remoteTheme);
      applyThemeToDom(remoteTheme);
      return remoteTheme;
    }
  } catch (err) {
    console.debug("[Theme] Supabase fetch note:", err);
  }

  const local = getLocalTheme();
  applyThemeToDom(local);
  return local;
}

/**
 * Publish theme changes to database and local storage (Privileged: Admin / Superadmin)
 */
export async function publishStudioTheme(
  theme: StudioTheme,
  userEmail?: string
): Promise<{ success: boolean; cloudSynced: boolean; error?: string }> {
  const updatedTheme: StudioTheme = {
    ...theme,
    updated_at: new Date().toISOString(),
    updated_by: userEmail || "CMS Admin",
  };

  // 1. Local-first apply and persist
  saveLocalTheme(updatedTheme);
  applyThemeToDom(updatedTheme);
  broadcastThemeUpdate(updatedTheme);

  // 2. Persist to Supabase if table exists
  let cloudSynced = false;
  let cloudError: string | undefined;

  try {
    const { error } = await supabase.from("site_theme" as any).upsert({
      id: "current_theme",
      theme_data: updatedTheme,
      updated_at: updatedTheme.updated_at,
      updated_by: updatedTheme.updated_by,
    });

    if (!error) {
      cloudSynced = true;
    } else {
      cloudError = error.message;
    }
  } catch (err: any) {
    cloudError = err?.message || String(err);
  }

  return { success: true, cloudSynced, error: cloudError };
}

/**
 * Reset theme to default signature palette
 */
export async function resetStudioTheme(userEmail?: string): Promise<StudioTheme> {
  const def = { ...DEFAULT_STUDIO_THEME };
  await publishStudioTheme(def, userEmail);
  return def;
}
