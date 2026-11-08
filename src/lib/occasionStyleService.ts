import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OccasionItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  badgeColor?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StyleItem {
  id: string;
  name: string;
  slug: string;
  description?: string;
  badgeColor?: string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

export const DEFAULT_OCCASIONS: OccasionItem[] = [
  {
    id: "occ_wedding",
    name: "Wedding",
    slug: "wedding",
    description: "Bespoke tiered cakes crafted for weddings, civil partnerships, and celebrations of love.",
    badgeColor: "#ec4899", // pink-500
    isActive: true,
    order: 1,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "occ_birthday",
    name: "Birthday",
    slug: "birthday",
    description: "Creative milestone and birthday cakes tailored to personal themes, ages, and hobbies.",
    badgeColor: "#f59e0b", // amber-500
    isActive: true,
    order: 2,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "occ_corporate",
    name: "Corporate",
    slug: "corporate",
    description: "Sharp, on-brand centrepieces and edible logos for brand launches, galas, and milestones.",
    badgeColor: "#3b82f6", // blue-500
    isActive: true,
    order: 3,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "occ_celebration",
    name: "Celebration",
    slug: "celebration",
    description: "Anniversaries, graduations, engagements, and special family gatherings.",
    badgeColor: "#8b5cf6", // purple-500
    isActive: true,
    order: 4,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "occ_babyshower",
    name: "Baby Shower",
    slug: "baby-shower",
    description: "Gentle pastels, gender reveals, and sweet welcomes for new family arrivals.",
    badgeColor: "#06b6d4", // cyan-500
    isActive: true,
    order: 5,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "occ_tastingbox",
    name: "Tasting Box",
    slug: "tasting-box",
    description: "Six-slice signature sample boxes delivered to your door to decide at home together.",
    badgeColor: "#10b981", // emerald-500
    isActive: true,
    order: 6,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
];

export const DEFAULT_STYLES: StyleItem[] = [
  {
    id: "sty_buttercream",
    name: "Buttercream",
    slug: "buttercream",
    description: "Silky Swiss meringue buttercream with smooth finishes, textured palette-knife waves, or piped florals.",
    badgeColor: "#f59e0b",
    isActive: true,
    order: 1,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "sty_sculpted",
    name: "Sculpted",
    slug: "sculpted",
    description: "Hand-carved 3D novelty cakes and realistic sculptural designs for unforgettable surprises.",
    badgeColor: "#ec4899",
    isActive: true,
    order: 2,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "sty_fondant",
    name: "Fondant",
    slug: "fondant",
    description: "Sleek, razor-sharp fondant finishes with hand-crafted sugar flowers and kintsugi gold accents.",
    badgeColor: "#3b82f6",
    isActive: true,
    order: 3,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "sty_dietary",
    name: "Dietary-Friendly",
    slug: "dietary-friendly",
    description: "Vegan, gluten-free, dairy-free, or egg-free recipes that never compromise on taste or texture.",
    badgeColor: "#10b981",
    isActive: true,
    order: 4,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "sty_naked",
    name: "Semi-Naked & Rustic",
    slug: "semi-naked-rustic",
    description: "Subtle outer crumb coat highlighting natural sponge layers and fresh botanical elements.",
    badgeColor: "#8b5cf6",
    isActive: true,
    order: 5,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
  {
    id: "sty_floral",
    name: "Pressed Florals",
    slug: "pressed-florals",
    description: "Pressed edible organic petals and botanical blooms pressed into silky buttercream.",
    badgeColor: "#14b8a6",
    isActive: true,
    order: 6,
    createdAt: "2026-10-20T10:00:00.000Z",
    updatedAt: "2026-10-20T10:00:00.000Z",
  },
];

export const TAXONOMY_BROADCAST_EVENT = "redycakes_taxonomy_updated";
const OCCASIONS_STORAGE_KEY = "redycakes_occasions_cache";
const STYLES_STORAGE_KEY = "redycakes_styles_cache";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Normalizes an array of raw occasion objects.
 */
export function normalizeOccasionList(rawList: any[]): OccasionItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_OCCASIONS;
  }
  return rawList.map((item, idx) => ({
    id: String(item.id || `occ_${slugify(item.name || `occ_${idx + 1}`)}`),
    name: String(item.name || "").trim(),
    slug: String(item.slug || slugify(item.name || "")),
    description: item.description ? String(item.description).trim() : undefined,
    badgeColor: item.badgeColor || "#8B5CF6",
    isActive: item.isActive !== false,
    order: typeof item.order === "number" ? item.order : idx + 1,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));
}

/**
 * Normalizes an array of raw style objects.
 */
export function normalizeStyleList(rawList: any[]): StyleItem[] {
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return DEFAULT_STYLES;
  }
  return rawList.map((item, idx) => ({
    id: String(item.id || `sty_${slugify(item.name || `sty_${idx + 1}`)}`),
    name: String(item.name || "").trim(),
    slug: String(item.slug || slugify(item.name || "")),
    description: item.description ? String(item.description).trim() : undefined,
    badgeColor: item.badgeColor || "#EC4899",
    isActive: item.isActive !== false,
    order: typeof item.order === "number" ? item.order : idx + 1,
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: item.updatedAt || new Date().toISOString(),
  }));
}

/**
 * Retrieves cached occasions safely.
 */
export function getStoredOccasions(): OccasionItem[] {
  if (typeof window === "undefined") return DEFAULT_OCCASIONS;
  try {
    const raw = localStorage.getItem(OCCASIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeOccasionList(parsed);
      }
    }
    const siteRaw = localStorage.getItem("redycakes_site_content_cache");
    if (siteRaw) {
      const parsedSite = JSON.parse(siteRaw);
      if (Array.isArray(parsedSite.occasions) && parsedSite.occasions.length > 0) {
        return normalizeOccasionList(parsedSite.occasions);
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_OCCASIONS;
}

/**
 * Retrieves active occasions for storefront display.
 */
export function getActiveOccasions(): OccasionItem[] {
  const list = getStoredOccasions();
  return (Array.isArray(list) ? list : DEFAULT_OCCASIONS)
    .filter((o) => o?.isActive)
    .sort((a, b) => a.order - b.order);
}

/**
 * Retrieves cached styles safely.
 */
export function getStoredStyles(): StyleItem[] {
  if (typeof window === "undefined") return DEFAULT_STYLES;
  try {
    const raw = localStorage.getItem(STYLES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return normalizeStyleList(parsed);
      }
    }
    const siteRaw = localStorage.getItem("redycakes_site_content_cache");
    if (siteRaw) {
      const parsedSite = JSON.parse(siteRaw);
      if (Array.isArray(parsedSite.styles) && parsedSite.styles.length > 0) {
        return normalizeStyleList(parsedSite.styles);
      }
    }
  } catch {
    // fallback
  }
  return DEFAULT_STYLES;
}

/**
 * Retrieves active styles for storefront display.
 */
export function getActiveStyles(): StyleItem[] {
  const list = getStoredStyles();
  return (Array.isArray(list) ? list : DEFAULT_STYLES)
    .filter((s) => s?.isActive)
    .sort((a, b) => a.order - b.order);
}

/**
 * Broadcasts taxonomy updates across windows and tabs.
 */
function broadcastTaxonomyUpdate(data: { occasions?: OccasionItem[]; styles?: StyleItem[] }) {
  if (typeof window === "undefined") return;
  try {
    window.dispatchEvent(new CustomEvent(TAXONOMY_BROADCAST_EVENT, { detail: data }));
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("redycakes_taxonomy_channel");
      bc.postMessage({ type: "TAXONOMY_UPDATED", ...data, timestamp: Date.now() });
      bc.close();
    }
  } catch {
    // Ignore broadcast errors
  }
}

/**
 * Persists occasions and styles to local storage and Supabase.
 */
export async function persistTaxonomy(data: {
  occasions?: OccasionItem[];
  styles?: StyleItem[];
}): Promise<{ success: boolean; cloudSynced: boolean; error?: string }> {
  if (typeof window !== "undefined") {
    try {
      if (data.occasions) {
        localStorage.setItem(OCCASIONS_STORAGE_KEY, JSON.stringify(data.occasions));
      }
      if (data.styles) {
        localStorage.setItem(STYLES_STORAGE_KEY, JSON.stringify(data.styles));
      }

      // Also best-effort update site_content in localStorage if present
      const rawSite = localStorage.getItem("redycakes_site_content_cache");
      if (rawSite) {
        const parsed = JSON.parse(rawSite);
        if (data.occasions) parsed.occasions = data.occasions;
        if (data.styles) parsed.styles = data.styles;
        localStorage.setItem("redycakes_site_content_cache", JSON.stringify(parsed));
        window.dispatchEvent(new CustomEvent("redycakes_content_updated", { detail: parsed }));
      }
    } catch (e) {
      console.error("Failed to save taxonomy to localStorage", e);
    }
  }

  broadcastTaxonomyUpdate(data);

  let cloudSynced = false;

  // Sync to Supabase site_content table
  try {
    const { data: existingData } = await supabase
      .from("site_content" as any)
      .select("content")
      .eq("id", "current_content")
      .single();

    if (existingData && (existingData as any).content) {
      const updated = {
        ...(existingData as any).content,
        ...(data.occasions ? { occasions: data.occasions } : {}),
        ...(data.styles ? { styles: data.styles } : {}),
      };
      await supabase.from("site_content" as any).upsert({
        id: "current_content",
        content: updated,
        updated_at: new Date().toISOString(),
      });
      cloudSynced = true;
    }
  } catch {
    // optional fallback
  }

  // Best-effort sync to standalone tables if they exist
  try {
    if (data.occasions && data.occasions.length > 0) {
      const occRecords = data.occasions.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        description: o.description || null,
        badge_color: o.badgeColor || null,
        is_active: o.isActive,
        display_order: o.order,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("occasions" as any).upsert(occRecords);
    }
  } catch {}

  try {
    if (data.styles && data.styles.length > 0) {
      const styRecords = data.styles.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        description: s.description || null,
        badge_color: s.badgeColor || null,
        is_active: s.isActive,
        display_order: s.order,
        updated_at: new Date().toISOString(),
      }));
      await supabase.from("styles" as any).upsert(styRecords);
    }
  } catch {}

  return { success: true, cloudSynced };
}

// ----------------------------------------------------
// OCCASION CRUD METHODS
// ----------------------------------------------------

export async function addOccasion(item: {
  name: string;
  slug?: string;
  description?: string;
  badgeColor?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; occasion: OccasionItem; allOccasions: OccasionItem[] }> {
  const current = getStoredOccasions();
  const trimmedName = item.name.trim();
  const computedSlug = item.slug ? slugify(item.slug) : slugify(trimmedName);
  const now = new Date().toISOString();

  const newOccasion: OccasionItem = {
    id: `occ_${computedSlug || Date.now()}`,
    name: trimmedName,
    slug: computedSlug || `occasion-${Date.now()}`,
    description: item.description?.trim(),
    badgeColor: item.badgeColor || "#8B5CF6",
    isActive: item.isActive !== false,
    order: current.length + 1,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...current, newOccasion];
  await persistTaxonomy({ occasions: updated });
  return { success: true, occasion: newOccasion, allOccasions: updated };
}

export async function updateOccasion(
  id: string,
  updates: Partial<Omit<OccasionItem, "id">>,
  options?: { syncLinkedCakes?: boolean }
): Promise<{ success: boolean; allOccasions: OccasionItem[] }> {
  const current = getStoredOccasions();
  const target = current.find((o) => o.id === id);
  if (!target) {
    return { success: false, allOccasions: current };
  }

  const oldName = target.name;
  const newName = updates.name !== undefined ? updates.name.trim() : target.name;

  const updated = current.map((o) => {
    if (o.id === id) {
      return {
        ...o,
        ...updates,
        name: newName,
        slug: updates.slug !== undefined ? slugify(updates.slug) : updates.name !== undefined ? slugify(newName) : o.slug,
        description: updates.description !== undefined ? updates.description.trim() : o.description,
        badgeColor: updates.badgeColor !== undefined ? updates.badgeColor : o.badgeColor,
        isActive: updates.isActive !== undefined ? updates.isActive : o.isActive,
        updatedAt: new Date().toISOString(),
      };
    }
    return o;
  });

  await persistTaxonomy({ occasions: updated });

  // If name changed and syncLinkedCakes is requested, update existing cakes in gallery
  if (options?.syncLinkedCakes && oldName !== newName && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("redycakes_site_content_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.gallery)) {
          let modified = false;
          const updatedGallery = parsed.gallery.map((cake: any) => {
            if (cake.occasion === oldName) {
              modified = true;
              return { ...cake, occasion: newName };
            }
            return cake;
          });
          if (modified) {
            parsed.gallery = updatedGallery;
            localStorage.setItem("redycakes_site_content_cache", JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent("redycakes_content_updated", { detail: parsed }));
          }
        }
      }
    } catch {}
  }

  return { success: true, allOccasions: updated };
}

export async function deleteOccasion(
  id: string,
  options?: { fallbackOccasion?: string }
): Promise<{ success: boolean; allOccasions: OccasionItem[] }> {
  const current = getStoredOccasions();
  const target = current.find((o) => o.id === id);
  if (!target) {
    return { success: false, allOccasions: current };
  }

  const filtered = current.filter((o) => o.id !== id);
  const reindexed = filtered.map((o, idx) => ({ ...o, order: idx + 1 }));

  await persistTaxonomy({ occasions: reindexed });

  // Optional: reassign cakes that had this occasion
  if (options?.fallbackOccasion && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("redycakes_site_content_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.gallery)) {
          let modified = false;
          const updatedGallery = parsed.gallery.map((cake: any) => {
            if (cake.occasion === target.name) {
              modified = true;
              return { ...cake, occasion: options.fallbackOccasion };
            }
            return cake;
          });
          if (modified) {
            parsed.gallery = updatedGallery;
            localStorage.setItem("redycakes_site_content_cache", JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent("redycakes_content_updated", { detail: parsed }));
          }
        }
      }
    } catch {}
  }

  // Best-effort delete from standalone table
  try {
    await supabase.from("occasions" as any).delete().eq("id", id);
  } catch {}

  return { success: true, allOccasions: reindexed };
}

export async function reorderOccasions(newOrder: OccasionItem[]): Promise<{ success: boolean; allOccasions: OccasionItem[] }> {
  const indexed = newOrder.map((o, idx) => ({ ...o, order: idx + 1 }));
  await persistTaxonomy({ occasions: indexed });
  return { success: true, allOccasions: indexed };
}

export async function resetOccasionsToDefault(): Promise<{ success: boolean; allOccasions: OccasionItem[] }> {
  await persistTaxonomy({ occasions: DEFAULT_OCCASIONS });
  return { success: true, allOccasions: DEFAULT_OCCASIONS };
}

// ----------------------------------------------------
// STYLE CRUD METHODS
// ----------------------------------------------------

export async function addStyle(item: {
  name: string;
  slug?: string;
  description?: string;
  badgeColor?: string;
  isActive?: boolean;
}): Promise<{ success: boolean; style: StyleItem; allStyles: StyleItem[] }> {
  const current = getStoredStyles();
  const trimmedName = item.name.trim();
  const computedSlug = item.slug ? slugify(item.slug) : slugify(trimmedName);
  const now = new Date().toISOString();

  const newStyle: StyleItem = {
    id: `sty_${computedSlug || Date.now()}`,
    name: trimmedName,
    slug: computedSlug || `style-${Date.now()}`,
    description: item.description?.trim(),
    badgeColor: item.badgeColor || "#EC4899",
    isActive: item.isActive !== false,
    order: current.length + 1,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...current, newStyle];
  await persistTaxonomy({ styles: updated });
  return { success: true, style: newStyle, allStyles: updated };
}

export async function updateStyle(
  id: string,
  updates: Partial<Omit<StyleItem, "id">>,
  options?: { syncLinkedCakes?: boolean }
): Promise<{ success: boolean; allStyles: StyleItem[] }> {
  const current = getStoredStyles();
  const target = current.find((s) => s.id === id);
  if (!target) {
    return { success: false, allStyles: current };
  }

  const oldName = target.name;
  const newName = updates.name !== undefined ? updates.name.trim() : target.name;

  const updated = current.map((s) => {
    if (s.id === id) {
      return {
        ...s,
        ...updates,
        name: newName,
        slug: updates.slug !== undefined ? slugify(updates.slug) : updates.name !== undefined ? slugify(newName) : s.slug,
        description: updates.description !== undefined ? updates.description.trim() : s.description,
        badgeColor: updates.badgeColor !== undefined ? updates.badgeColor : s.badgeColor,
        isActive: updates.isActive !== undefined ? updates.isActive : s.isActive,
        updatedAt: new Date().toISOString(),
      };
    }
    return s;
  });

  await persistTaxonomy({ styles: updated });

  // If name changed and syncLinkedCakes requested, update gallery cakes
  if (options?.syncLinkedCakes && oldName !== newName && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("redycakes_site_content_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.gallery)) {
          let modified = false;
          const updatedGallery = parsed.gallery.map((cake: any) => {
            if (cake.style === oldName) {
              modified = true;
              return { ...cake, style: newName };
            }
            return cake;
          });
          if (modified) {
            parsed.gallery = updatedGallery;
            localStorage.setItem("redycakes_site_content_cache", JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent("redycakes_content_updated", { detail: parsed }));
          }
        }
      }
    } catch {}
  }

  return { success: true, allStyles: updated };
}

export async function deleteStyle(
  id: string,
  options?: { fallbackStyle?: string }
): Promise<{ success: boolean; allStyles: StyleItem[] }> {
  const current = getStoredStyles();
  const target = current.find((s) => s.id === id);
  if (!target) {
    return { success: false, allStyles: current };
  }

  const filtered = current.filter((s) => s.id !== id);
  const reindexed = filtered.map((s, idx) => ({ ...s, order: idx + 1 }));

  await persistTaxonomy({ styles: reindexed });

  // Optional: reassign cakes that had this style
  if (options?.fallbackStyle && typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("redycakes_site_content_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed.gallery)) {
          let modified = false;
          const updatedGallery = parsed.gallery.map((cake: any) => {
            if (cake.style === target.name) {
              modified = true;
              return { ...cake, style: options.fallbackStyle };
            }
            return cake;
          });
          if (modified) {
            parsed.gallery = updatedGallery;
            localStorage.setItem("redycakes_site_content_cache", JSON.stringify(parsed));
            window.dispatchEvent(new CustomEvent("redycakes_content_updated", { detail: parsed }));
          }
        }
      }
    } catch {}
  }

  // Best-effort delete from standalone table
  try {
    await supabase.from("styles" as any).delete().eq("id", id);
  } catch {}

  return { success: true, allStyles: reindexed };
}

export async function reorderStyles(newOrder: StyleItem[]): Promise<{ success: boolean; allStyles: StyleItem[] }> {
  const indexed = newOrder.map((s, idx) => ({ ...s, order: idx + 1 }));
  await persistTaxonomy({ styles: indexed });
  return { success: true, allStyles: indexed };
}

export async function resetStylesToDefault(): Promise<{ success: boolean; allStyles: StyleItem[] }> {
  await persistTaxonomy({ styles: DEFAULT_STYLES });
  return { success: true, allStyles: DEFAULT_STYLES };
}

// ----------------------------------------------------
// REACT HOOK FOR REAL-TIME CONSUMPTION
// ----------------------------------------------------

export function useOccasionsAndStyles() {
  const [occasions, setOccasions] = useState<OccasionItem[]>(() => {
    try {
      const stored = getStoredOccasions();
      return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_OCCASIONS;
    } catch {
      return DEFAULT_OCCASIONS;
    }
  });

  const [styles, setStyles] = useState<StyleItem[]>(() => {
    try {
      const stored = getStoredStyles();
      return Array.isArray(stored) && stored.length > 0 ? stored : DEFAULT_STYLES;
    } catch {
      return DEFAULT_STYLES;
    }
  });

  const safeOccasions = Array.isArray(occasions) && occasions.length > 0 ? occasions : DEFAULT_OCCASIONS;
  const safeStyles = Array.isArray(styles) && styles.length > 0 ? styles : DEFAULT_STYLES;

  const refresh = useCallback(() => {
    try {
      const o = getStoredOccasions();
      const s = getStoredStyles();
      setOccasions(Array.isArray(o) && o.length > 0 ? o : DEFAULT_OCCASIONS);
      setStyles(Array.isArray(s) && s.length > 0 ? s : DEFAULT_STYLES);
    } catch {
      setOccasions(DEFAULT_OCCASIONS);
      setStyles(DEFAULT_STYLES);
    }
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      refresh();
    };

    window.addEventListener(TAXONOMY_BROADCAST_EVENT, handleUpdate);
    window.addEventListener("redycakes_content_updated", handleUpdate);

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== "undefined") {
      try {
        bc = new BroadcastChannel("redycakes_taxonomy_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "TAXONOMY_UPDATED") {
            refresh();
          }
        };
      } catch {
        // ignore
      }
    }

    return () => {
      window.removeEventListener(TAXONOMY_BROADCAST_EVENT, handleUpdate);
      window.removeEventListener("redycakes_content_updated", handleUpdate);
      if (bc) bc.close();
    };
  }, [refresh]);

  return {
    occasions: safeOccasions,
    styles: safeStyles,
    activeOccasions: safeOccasions.filter((o) => o?.isActive).sort((a, b) => a.order - b.order),
    activeStyles: safeStyles.filter((s) => s?.isActive).sort((a, b) => a.order - b.order),
    refresh,
    addOccasion,
    updateOccasion,
    deleteOccasion,
    reorderOccasions,
    resetOccasionsToDefault,
    addStyle,
    updateStyle,
    deleteStyle,
    reorderStyles,
    resetStylesToDefault,
  };
}
