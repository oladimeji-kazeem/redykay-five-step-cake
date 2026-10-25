import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type PaymentCurrency = "GBP" | "EUR" | "USD" | "NGN";
export type PaymentProvider = "stripe" | "paystack" | "custom_link";
export type PaymentEnvironment = "live" | "test";
export type PaymentStatus = "Unpaid" | "Deposit Paid" | "Paid in Full" | "Refunded" | "Pending Verification";
export type PaymentMethod = "card" | "bank_transfer" | "cash" | "other";

export interface PaymentSettings {
  enabled: boolean;
  currency: PaymentCurrency;
  currencySymbol: string;
  onlinePayments: {
    enabled: boolean;
    provider: PaymentProvider;
    environment: PaymentEnvironment;
    stripePublicKey: string;
    stripeSecretKey?: string;
    paystackPublicKey: string;
    customPaymentLink: string;
    statementDescriptor: string;
    allowDirectCardCheckout: boolean;
  };
  bankTransfer: {
    enabled: boolean;
    bankName: string;
    accountName: string;
    sortCode: string;
    accountNumber: string;
    iban?: string;
    swiftBic?: string;
    referencePrefix: string;
    referenceInstructions: string;
  };
  depositRules: {
    depositPercentage: number;
    minimumDeposit: number;
    tastingBoxPrice: number;
    tastingBoxRequiresFullPayment: boolean;
    balanceDueDaysBefore: number;
    depositPolicyNotice: string;
  };
  notifications: {
    whatsappNumber: string;
    whatsappProofNotice: string;
    billingEmail: string;
  };
  updatedAt?: string;
  updatedBy?: string;
}

export interface PaymentTransaction {
  id: string;
  created_at: string;
  order_id?: string;
  customer_name: string;
  customer_email: string;
  amount: number;
  currency: string;
  payment_type: "deposit" | "full" | "tasting_box" | "balance";
  method: PaymentMethod;
  status: "completed" | "pending" | "failed";
  reference: string;
  notes?: string;
  gateway_response?: Record<string, unknown>;
}

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  enabled: true,
  currency: "GBP",
  currencySymbol: "£",
  onlinePayments: {
    enabled: true,
    provider: "stripe",
    environment: "live",
    stripePublicKey: "pk_live_51PTestRedycakesLiveKeyExample1234567890",
    stripeSecretKey: "",
    paystackPublicKey: "pk_live_redycakes_paystack_live_key_example",
    customPaymentLink: "https://buy.stripe.com/example_redycakes_deposit",
    statementDescriptor: "REDYCAKES BAKERY",
    allowDirectCardCheckout: true,
  },
  bankTransfer: {
    enabled: true,
    bankName: "Barclays Bank UK",
    accountName: "Redycakes Ltd",
    sortCode: "20-04-15",
    accountNumber: "83920147",
    iban: "GB33BARC20041583920147",
    swiftBic: "BARCGB22",
    referencePrefix: "RCK-",
    referenceInstructions: "Please use your Order Reference (e.g. RCK-XXXX) or your full name as payment reference.",
  },
  depositRules: {
    depositPercentage: 50,
    minimumDeposit: 50,
    tastingBoxPrice: 25,
    tastingBoxRequiresFullPayment: true,
    balanceDueDaysBefore: 7,
    depositPolicyNotice: "A 50% deposit secures your date in our diary. Balance is due 7 days prior to collection/delivery.",
  },
  notifications: {
    whatsappNumber: "447911123456",
    whatsappProofNotice: "After sending your bank transfer, send a screenshot or receipt to our WhatsApp for instant booking confirmation.",
    billingEmail: "accounts@redycakes.co.uk",
  },
  updatedAt: new Date().toISOString(),
  updatedBy: "System Default",
};

const STORAGE_PAYMENT_SETTINGS = "redycakes_payment_settings_cache";
const STORAGE_PAYMENT_TRANSACTIONS = "redycakes_payment_transactions_cache";
const PAYMENT_UPDATE_EVENT = "redycakes_payment_settings_updated";

export function getCurrencySymbol(curr: PaymentCurrency): string {
  switch (curr) {
    case "EUR": return "€";
    case "USD": return "$";
    case "NGN": return "₦";
    case "GBP":
    default: return "£";
  }
}

export function formatMoney(amount: number | string | undefined | null, currency: PaymentCurrency = "GBP"): string {
  if (amount === undefined || amount === null || amount === "") return "£0.00";
  const num = typeof amount === "number" ? amount : parseFloat(String(amount).replace(/[^0-9.]/g, "")) || 0;
  const sym = getCurrencySymbol(currency);
  return `${sym}${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function getCachedPaymentSettings(): PaymentSettings {
  if (typeof window === "undefined") return DEFAULT_PAYMENT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_PAYMENT_SETTINGS);
    if (!raw) return DEFAULT_PAYMENT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PAYMENT_SETTINGS,
      ...parsed,
      onlinePayments: { ...DEFAULT_PAYMENT_SETTINGS.onlinePayments, ...(parsed.onlinePayments || {}) },
      bankTransfer: { ...DEFAULT_PAYMENT_SETTINGS.bankTransfer, ...(parsed.bankTransfer || {}) },
      depositRules: { ...DEFAULT_PAYMENT_SETTINGS.depositRules, ...(parsed.depositRules || {}) },
      notifications: { ...DEFAULT_PAYMENT_SETTINGS.notifications, ...(parsed.notifications || {}) },
    };
  } catch {
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

export function saveCachedPaymentSettings(settings: PaymentSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_PAYMENT_SETTINGS, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent(PAYMENT_UPDATE_EVENT, { detail: settings }));
  } catch (e) {
    console.error("Failed to save payment settings to localStorage", e);
  }
}

export async function fetchPaymentSettingsFromSupabase(): Promise<PaymentSettings | null> {
  try {
    const { data, error } = await supabase
      .from("payment_settings" as any)
      .select("settings")
      .eq("id", "current_settings")
      .single();

    if (!error && data && (data as any).settings) {
      return (data as any).settings as PaymentSettings;
    }
  } catch (err) {
    console.debug("[PaymentSettings] Note:", err);
  }
  return null;
}

export async function persistPaymentSettings(settings: PaymentSettings, userEmail?: string): Promise<boolean> {
  const payload: PaymentSettings = {
    ...settings,
    currencySymbol: getCurrencySymbol(settings.currency),
    updatedAt: new Date().toISOString(),
    updatedBy: userEmail || "Privileged User",
  };

  saveCachedPaymentSettings(payload);

  try {
    const { error } = await supabase
      .from("payment_settings" as any)
      .upsert({
        id: "current_settings",
        settings: payload,
        updated_at: payload.updatedAt,
        updated_by: payload.updatedBy,
      });

    if (error) {
      console.debug("[PaymentSettings] Supabase upsert note:", error.message);
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function usePaymentSettings() {
  const [settings, setSettings] = useState<PaymentSettings>(getCachedPaymentSettings);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchPaymentSettingsFromSupabase().then((remote) => {
      if (remote) {
        setSettings(remote);
        saveCachedPaymentSettings(remote);
      }
    });

    const handler = (e: Event) => {
      const custom = e as CustomEvent<PaymentSettings>;
      if (custom.detail) {
        setSettings(custom.detail);
      }
    };
    window.addEventListener(PAYMENT_UPDATE_EVENT, handler);
    return () => window.removeEventListener(PAYMENT_UPDATE_EVENT, handler);
  }, []);

  const updateSettings = useCallback(
    async (
      newSettings: PaymentSettings | ((prev: PaymentSettings) => PaymentSettings),
      userEmail?: string
    ) => {
      setIsSaving(true);
      const resolved = typeof newSettings === "function" ? newSettings(settings) : newSettings;
      setSettings(resolved);
      const ok = await persistPaymentSettings(resolved, userEmail);
      setIsSaving(false);
      return ok;
    },
    [settings]
  );

  const resetSettings = useCallback(async (userEmail?: string) => {
    return updateSettings(DEFAULT_PAYMENT_SETTINGS, userEmail);
  }, [updateSettings]);

  return {
    settings,
    updateSettings,
    resetSettings,
    isSaving,
  };
}

export async function fetchPaymentTransactions(): Promise<PaymentTransaction[]> {
  try {
    const { data, error } = await supabase
      .from("payment_transactions" as any)
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data && data.length > 0) {
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_PAYMENT_TRANSACTIONS, JSON.stringify(data));
      }
      return data as PaymentTransaction[];
    }
  } catch (err) {
    console.debug("[PaymentTransactions] Note:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_PAYMENT_TRANSACTIONS);
      if (raw) return JSON.parse(raw);
    } catch {
      // Ignore
    }
  }

  return [];
}

export async function recordPaymentTransaction(
  tx: Omit<PaymentTransaction, "id" | "created_at">
): Promise<PaymentTransaction> {
  const newTx: PaymentTransaction = {
    ...tx,
    id: typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "tx_" + Math.random().toString(36).substring(2, 9),
    created_at: new Date().toISOString(),
  };

  try {
    await supabase.from("payment_transactions" as any).insert(newTx);
  } catch (err) {
    console.debug("[PaymentTransactions] Insert note:", err);
  }

  if (typeof window !== "undefined") {
    try {
      const existing = await fetchPaymentTransactions();
      const updated = [newTx, ...existing.filter((t) => t.id !== newTx.id)];
      localStorage.setItem(STORAGE_PAYMENT_TRANSACTIONS, JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }

  return newTx;
}
