import { supabase } from "@/integrations/supabase/client";

export const COMPLETE_SUPABASE_SQL = `-- Redycakes Complete Database Schema
-- Run this script in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/coblvntmcbnyardnsrcs/sql/new

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Site Content Management Table
CREATE TABLE IF NOT EXISTS public.site_content (
  id text PRIMARY KEY DEFAULT 'current_content',
  content jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.site_content TO anon, authenticated, service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read site_content" ON public.site_content;
CREATE POLICY "Public read site_content" ON public.site_content FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Public write site_content" ON public.site_content;
CREATE POLICY "Public write site_content" ON public.site_content FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 3. Order Requests Table
CREATE TABLE IF NOT EXISTS public.order_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  occasion text NOT NULL,
  event_date date NOT NULL,
  guests text,
  budget text NOT NULL,
  flavours text[] NOT NULL DEFAULT '{}',
  dietary text[] NOT NULL DEFAULT '{}',
  fulfilment text DEFAULT 'Collection',
  notes text,
  inspiration_paths text[] NOT NULL DEFAULT '{}',
  status text NOT NULL DEFAULT 'New'
);
GRANT ALL ON public.order_requests TO anon, authenticated, service_role;
ALTER TABLE public.order_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can submit order_requests" ON public.order_requests;
CREATE POLICY "Anyone can submit order_requests" ON public.order_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Privileged can read order_requests" ON public.order_requests;
CREATE POLICY "Privileged can read order_requests" ON public.order_requests FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Privileged can update order_requests" ON public.order_requests;
CREATE POLICY "Privileged can update order_requests" ON public.order_requests FOR UPDATE TO anon, authenticated USING (true);

-- 4. Contact Messages Table
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'New'
);
GRANT ALL ON public.contact_messages TO anon, authenticated, service_role;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can send contact_messages" ON public.contact_messages;
CREATE POLICY "Anyone can send contact_messages" ON public.contact_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Privileged can read contact_messages" ON public.contact_messages;
CREATE POLICY "Privileged can read contact_messages" ON public.contact_messages FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "Privileged can update contact_messages" ON public.contact_messages;
CREATE POLICY "Privileged can update contact_messages" ON public.contact_messages FOR UPDATE TO anon, authenticated USING (true);

-- 5. CMS Privileged Users Table
CREATE TABLE IF NOT EXISTS public.cms_users (
  id text PRIMARY KEY,
  email text NOT NULL UNIQUE,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'editor',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  last_login timestamptz
);
GRANT ALL ON public.cms_users TO anon, authenticated, service_role;
ALTER TABLE public.cms_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Privileged users management" ON public.cms_users;
CREATE POLICY "Privileged users management" ON public.cms_users FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- 6. Web Analytics Pageviews Table
CREATE TABLE IF NOT EXISTS public.analytics_pageviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  page_path text NOT NULL,
  session_id text NOT NULL,
  device text,
  referrer text
);
GRANT ALL ON public.analytics_pageviews TO anon, authenticated, service_role;
ALTER TABLE public.analytics_pageviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert analytics_pageviews" ON public.analytics_pageviews;
CREATE POLICY "Anyone can insert analytics_pageviews" ON public.analytics_pageviews FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can read analytics_pageviews" ON public.analytics_pageviews;
CREATE POLICY "Anyone can read analytics_pageviews" ON public.analytics_pageviews FOR SELECT TO anon, authenticated USING (true);

-- 7. Web Analytics Events Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_name text NOT NULL,
  session_id text NOT NULL,
  metadata jsonb
);
GRANT ALL ON public.analytics_events TO anon, authenticated, service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert analytics_events" ON public.analytics_events;
CREATE POLICY "Anyone can insert analytics_events" ON public.analytics_events FOR INSERT TO anon, authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Anyone can read analytics_events" ON public.analytics_events;
CREATE POLICY "Anyone can read analytics_events" ON public.analytics_events FOR SELECT TO anon, authenticated USING (true);

-- 8. Storage bucket for inspiration images (if storage enabled)
INSERT INTO storage.buckets (id, name, public)
VALUES ('inspiration', 'inspiration', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public inspiration uploads" ON storage.objects;
CREATE POLICY "Public inspiration uploads" ON storage.objects
FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'inspiration');

DROP POLICY IF EXISTS "Public inspiration reads" ON storage.objects;
CREATE POLICY "Public inspiration reads" ON storage.objects
FOR SELECT TO anon, authenticated USING (bucket_id = 'inspiration');
`;

export const COMPLETE_DATABASE_SCHEMA_SQL = COMPLETE_SUPABASE_SQL;

export interface OrderItem {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  occasion: string;
  event_date: string;
  guests?: string | null;
  budget: string;
  flavours: string[];
  dietary: string[];
  fulfilment?: string | null;
  notes?: string | null;
  inspiration_paths?: string[];
  status: "New" | "Quoted" | "Confirmed" | "Baking" | "Completed" | "Archived";
  created_at: string;
}

export interface ContactItem {
  id: string;
  name: string;
  email: string;
  message: string;
  status: "New" | "Replied" | "Archived";
  created_at: string;
}

const STORAGE_ORDERS = "redycakes_orders_cache";
const STORAGE_MESSAGES = "redycakes_messages_cache";

function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function fetchOrders(): Promise<OrderItem[]> {
  // 1. Fetch directly from Supabase
  try {
    const { data, error } = await supabase
      .from("order_requests" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_ORDERS, JSON.stringify(data));
      }
      return data as OrderItem[];
    }
  } catch (err) {
    console.debug("[Orders] Supabase note:", err);
  }

  // 2. Local cache fallback if offline
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_ORDERS);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
  }

  return [];
}

export async function saveOrder(order: Omit<OrderItem, "id" | "created_at" | "status"> & { status?: OrderItem["status"] }): Promise<OrderItem> {
  const newOrder: OrderItem = {
    ...order,
    id: generateUuid(),
    status: order.status || "New",
    created_at: new Date().toISOString(),
  };

  // 1. Insert directly into Supabase
  try {
    const { data, error } = await supabase
      .from("order_requests" as any)
      .insert(newOrder)
      .select()
      .single();

    if (!error && data) {
      newOrder.id = data.id || newOrder.id;
    }
  } catch (err) {
    console.debug("[Orders] Supabase insert note:", err);
  }

  // 2. Update local cache
  if (typeof window !== "undefined") {
    try {
      const existing = await fetchOrders();
      const updated = [newOrder, ...existing.filter((o) => o.id !== newOrder.id)];
      localStorage.setItem(STORAGE_ORDERS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  return newOrder;
}

export async function updateOrderStatus(orderId: string, newStatus: OrderItem["status"]): Promise<void> {
  try {
    await supabase.from("order_requests" as any).update({ status: newStatus }).eq("id", orderId);
  } catch (err) {
    console.debug("[Orders] Supabase update note:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existing = await fetchOrders();
      const updated = existing.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o));
      localStorage.setItem(STORAGE_ORDERS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }
}

export async function fetchContactMessages(): Promise<ContactItem[]> {
  try {
    const { data, error } = await supabase
      .from("contact_messages" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(data));
      }
      return data as ContactItem[];
    }
  } catch (err) {
    console.debug("[Contact] Supabase note:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_MESSAGES);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
  }

  return [];
}

export async function saveContactMessage(msg: { name: string; email: string; message: string }): Promise<ContactItem> {
  const newMsg: ContactItem = {
    ...msg,
    id: generateUuid(),
    status: "New",
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("contact_messages" as any)
      .insert(newMsg)
      .select()
      .single();

    if (!error && data) {
      newMsg.id = data.id || newMsg.id;
    }
  } catch (err) {
    console.debug("[Contact] Supabase insert note:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existing = await fetchContactMessages();
      const updated = [newMsg, ...existing.filter((m) => m.id !== newMsg.id)];
      localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  return newMsg;
}

export type OrderRequest = OrderItem;
export type ContactMessage = ContactItem;

export async function updateMessageStatus(id: string, status: ContactItem["status"]): Promise<boolean> {
  // Update local storage
  if (typeof window !== "undefined") {
    try {
      const existing = await fetchContactMessages();
      const updated = existing.map((m) => (m.id === id ? { ...m, status } : m));
      localStorage.setItem(STORAGE_MESSAGES, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  // Update Supabase
  try {
    await supabase.from("contact_messages" as any).update({ status }).eq("id", id);
  } catch (err) {
    console.debug("[Contact] Supabase update note:", err);
  }

  return true;
}
