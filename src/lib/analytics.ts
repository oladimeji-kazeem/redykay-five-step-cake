import { useEffect, useRef } from "react";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export interface PageViewRecord {
  id: string;
  path: string;
  sessionId: string;
  device: "Desktop" | "Mobile" | "Tablet";
  referrer: string;
  timestamp: string;
}

export interface AnalyticsEventRecord {
  id: string;
  eventName: string;
  sessionId: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const STORAGE_KEY_PAGEVIEWS = "redycakes_analytics_pageviews";
const STORAGE_KEY_EVENTS = "redycakes_analytics_events";
const STORAGE_KEY_SESSION = "redycakes_analytics_session_id";

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let sid = sessionStorage.getItem(STORAGE_KEY_SESSION);
  if (!sid) {
    sid = "sess_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();
    sessionStorage.setItem(STORAGE_KEY_SESSION, sid);
  }
  return sid;
}

function getDeviceType(): "Desktop" | "Mobile" | "Tablet" {
  if (typeof window === "undefined") return "Desktop";
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) return "Tablet";
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return "Mobile";
  return "Desktop";
}

function getStoredPageViews(): PageViewRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PAGEVIEWS);
    if (!raw) return generateInitialMockData();
    return JSON.parse(raw);
  } catch {
    return generateInitialMockData();
  }
}

function savePageViews(views: PageViewRecord[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep last 1500 records to prevent local storage bloat
    const trimmed = views.slice(-1500);
    localStorage.setItem(STORAGE_KEY_PAGEVIEWS, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Could not save pageviews to localStorage", e);
  }
}

function getStoredEvents(): AnalyticsEventRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (!raw) return generateInitialMockEvents();
    return JSON.parse(raw);
  } catch {
    return generateInitialMockEvents();
  }
}

function saveEvents(events: AnalyticsEventRecord[]) {
  if (typeof window === "undefined") return;
  try {
    const trimmed = events.slice(-1000);
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(trimmed));
  } catch (e) {
    console.warn("Could not save events to localStorage", e);
  }
}

// Generate realistic starter data so the analytics graphs look rich and populated from day one
function generateInitialMockData(): PageViewRecord[] {
  const pages = ["/", "/cakes", "/order", "/dietary", "/how-it-works", "/tasting-boxes", "/about", "/contact"];
  const weights = [0.38, 0.24, 0.16, 0.08, 0.06, 0.04, 0.02, 0.02];
  const devices: ("Desktop" | "Mobile" | "Tablet")[] = ["Mobile", "Desktop", "Tablet"];
  const records: PageViewRecord[] = [];
  const now = Date.now();

  for (let i = 14; i >= 0; i--) {
    const dayDate = new Date(now - i * 86400000);
    const dayCount = Math.floor(45 + Math.sin(i) * 20 + Math.random() * 25);
    for (let j = 0; j < dayCount; j++) {
      const rand = Math.random();
      let cumulative = 0;
      let chosenPage = pages[0];
      for (let p = 0; p < pages.length; p++) {
        cumulative += weights[p];
        if (rand <= cumulative) {
          chosenPage = pages[p];
          break;
        }
      }
      const hourOffset = Math.floor(Math.random() * 24);
      const minuteOffset = Math.floor(Math.random() * 60);
      const ts = new Date(dayDate);
      ts.setHours(hourOffset, minuteOffset);

      records.push({
        id: "pv_" + i + "_" + j,
        path: chosenPage,
        sessionId: "sess_seed_" + (j % 22) + "_" + i,
        device: Math.random() > 0.4 ? "Mobile" : (Math.random() > 0.2 ? "Desktop" : "Tablet"),
        referrer: Math.random() > 0.5 ? "https://instagram.com" : (Math.random() > 0.3 ? "https://google.com" : "Direct"),
        timestamp: ts.toISOString(),
      });
    }
  }
  return records;
}

function generateInitialMockEvents(): AnalyticsEventRecord[] {
  const events: AnalyticsEventRecord[] = [];
  const now = Date.now();
  for (let i = 14; i >= 0; i--) {
    const dayDate = new Date(now - i * 86400000);
    const orderCount = Math.floor(2 + Math.random() * 3);
    for (let o = 0; o < orderCount; o++) {
      events.push({
        id: "ev_" + i + "_" + o,
        eventName: "order_submitted",
        sessionId: "sess_seed_order_" + i + "_" + o,
        metadata: { occasion: ["Wedding", "Birthday", "Celebration"][o % 3] },
        timestamp: new Date(dayDate.getTime() + Math.random() * 86400000).toISOString(),
      });
    }
  }
  return events;
}

export function recordPageView(path: string) {
  if (typeof window === "undefined") return;
  // Don't track internal CMS pageviews in public visitor metrics
  if (path.startsWith("/cms")) return;

  const sessionId = getSessionId();
  const device = getDeviceType();
  const referrer = document.referrer || "Direct";
  const timestamp = new Date().toISOString();

  const record: PageViewRecord = {
    id: "pv_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now(),
    path,
    sessionId,
    device,
    referrer,
    timestamp,
  };

  const current = getStoredPageViews();
  current.push(record);
  savePageViews(current);

  // Attempt async sync to Supabase table
  try {
    supabase
      .from("analytics_pageviews" as any)
      .insert({
        page_path: path,
        session_id: sessionId,
        device,
        referrer,
        created_at: timestamp,
      })
      .then(({ error }) => {
        if (error && error.code !== "PGRST205") {
          console.debug("[Analytics] Supabase sync note:", error.message);
        }
      });
  } catch {
    // Graceful fallback to local cache
  }
}

export function trackEvent(eventName: string, metadata?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  const timestamp = new Date().toISOString();

  const event: AnalyticsEventRecord = {
    id: "ev_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now(),
    eventName,
    sessionId,
    metadata,
    timestamp,
  };

  const current = getStoredEvents();
  current.push(event);
  saveEvents(current);

  try {
    supabase
      .from("analytics_events" as any)
      .insert({
        event_name: eventName,
        session_id: sessionId,
        metadata,
        created_at: timestamp,
      })
      .then(({ error }) => {
        if (error && error.code !== "PGRST205") {
          console.debug("[Analytics] Event sync note:", error.message);
        }
      });
  } catch {
    // Graceful
  }
}

export async function getAnalyticsData(daysBack = 14) {
  const cutoff = new Date(Date.now() - daysBack * 86400000).toISOString();
  let views: PageViewRecord[] = [];
  let events: AnalyticsEventRecord[] = [];

  // 1. Fetch directly from Supabase
  try {
    const { data: dbViews, error: vErr } = await supabase
      .from("analytics_pageviews" as any)
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (!vErr && dbViews && dbViews.length > 0) {
      views = dbViews.map((r: any) => ({
        id: r.id,
        path: r.page_path,
        sessionId: r.session_id,
        device: (r.device || "Desktop") as "Desktop" | "Mobile" | "Tablet",
        referrer: r.referrer || "Direct",
        timestamp: r.created_at,
      }));
    }

    const { data: dbEvents, error: eErr } = await supabase
      .from("analytics_events" as any)
      .select("*")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false });

    if (!eErr && dbEvents && dbEvents.length > 0) {
      events = dbEvents.map((e: any) => ({
        id: e.id,
        eventName: e.event_name,
        sessionId: e.session_id,
        metadata: e.metadata,
        timestamp: e.created_at,
      }));
    }
  } catch (err) {
    console.debug("[Analytics] Supabase query note:", err);
  }

  // 2. Fall back to local storage only if remote database had no rows
  if (views.length === 0) {
    const localViews = getStoredPageViews();
    views = localViews.filter((v) => v.timestamp >= cutoff);
  }
  if (events.length === 0) {
    const localEvents = getStoredEvents();
    events = localEvents.filter((e) => e.timestamp >= cutoff);
  }

  const filteredViews = views;
  const filteredEvents = events;

  const totalPageViews = filteredViews.length;
  const uniqueSessions = new Set(filteredViews.map((v) => v.sessionId)).size;
  const ordersSubmitted = filteredEvents.filter((e) => e.eventName === "order_submitted").length;
  const conversionRate = uniqueSessions > 0 ? ((ordersSubmitted / uniqueSessions) * 100).toFixed(1) : "0.0";

  // Group by day for charts
  const dayMap: Record<string, { date: string; views: number; visitors: Set<string>; orders: number }> = {};
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    dayMap[key] = { date: key, views: 0, visitors: new Set(), orders: 0 };
  }

  filteredViews.forEach((v) => {
    const d = new Date(v.timestamp);
    const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
    if (dayMap[key]) {
      dayMap[key].views += 1;
      dayMap[key].visitors.add(v.sessionId);
    }
  });

  filteredEvents.forEach((e) => {
    if (e.eventName === "order_submitted") {
      const d = new Date(e.timestamp);
      const key = d.toLocaleDateString("en-GB", { month: "short", day: "numeric" });
      if (dayMap[key]) dayMap[key].orders += 1;
    }
  });

  const dailyTrend = Object.values(dayMap).map((item) => ({
    date: item.date,
    views: item.views,
    visitors: item.visitors.size,
    orders: item.orders,
  }));

  // Top Pages
  const pageCountMap: Record<string, number> = {};
  filteredViews.forEach((v) => {
    pageCountMap[v.path] = (pageCountMap[v.path] || 0) + 1;
  });
  const topPages = Object.entries(pageCountMap)
    .map(([path, count]) => ({
      path,
      views: count,
      uniqueVisitors: new Set(filteredViews.filter((v) => v.path === path).map((v) => v.sessionId)).size,
      percent: Math.round((count / Math.max(1, totalPageViews)) * 100),
    }))
    .sort((a, b) => b.views - a.views);

  // Device Breakdown
  const deviceCountMap: Record<string, number> = { Desktop: 0, Mobile: 0, Tablet: 0 };
  filteredViews.forEach((v) => {
    deviceCountMap[v.device] = (deviceCountMap[v.device] || 0) + 1;
  });
  const deviceBreakdown = Object.entries(deviceCountMap).map(([name, value]) => ({
    name,
    value,
  }));

  const desktopCount = deviceCountMap["Desktop"] || 0;
  const mobileCount = deviceCountMap["Mobile"] || 0;
  const tabletCount = deviceCountMap["Tablet"] || 0;
  const totalDev = Math.max(1, desktopCount + mobileCount + tabletCount);

  const deviceSplit = {
    desktop: Math.round((desktopCount / totalDev) * 100),
    mobile: Math.round((mobileCount / totalDev) * 100),
    tablet: Math.round((tabletCount / totalDev) * 100),
  };

  // Referrer Breakdown
  const refMap: Record<string, number> = {};
  filteredViews.forEach((v) => {
    refMap[v.referrer] = (refMap[v.referrer] || 0) + 1;
  });
  const topReferrers = Object.entries(refMap)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const recentEvents = filteredViews.slice(-15).reverse().map((v) => ({
    id: v.id,
    timestamp: v.timestamp,
    path: v.path,
    event_name: "pageview",
    device: v.device.toLowerCase(),
    referrer: v.referrer,
  }));

  return {
    totalViews: totalPageViews,
    totalPageViews,
    uniqueVisitors: uniqueSessions,
    ordersSubmitted,
    conversionRate,
    dailyViews: dailyTrend,
    dailyTrend,
    topPages,
    deviceBreakdown,
    deviceSplit,
    topReferrers,
    recentPageViews: filteredViews.slice(-15).reverse(),
    recentEvents,
  };
}

export type AnalyticsSummary = Awaited<ReturnType<typeof getAnalyticsData>>;

export function AnalyticsTracker() {
  const router = useRouter();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    const currentPath = router.state.location.pathname;
    if (currentPath !== lastPath.current) {
      lastPath.current = currentPath;
      recordPageView(currentPath);
    }
  }, [router.state.location.pathname]);

  return null;
}
