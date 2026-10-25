import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  BarChart3,
  FileText,
  ShoppingBag,
  Mail,
  Users,
  Database,
  ExternalLink,
  LogOut,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Edit,
  Eye,
  Search,
  Copy,
  Check,
  Phone,
  MessageSquare,
  Shield,
  Smartphone,
  Laptop,
  Tablet,
  TrendingUp,
  Sparkles,
  CreditCard,
  Building2,
  Lock,
  ShieldCheck,
  ShieldAlert,
  KeyRound,
  DollarSign,
  Wallet,
  EyeOff,
  CheckCircle2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { seo } from "@/components/SiteLayout";
import {
  useSiteContent,
  defaultSiteContent,
  type SiteContent,
  type CakeItem,
  type StepItem,
  type FaqItem,
  type TrustItem,
  type DietaryCategory,
} from "@/lib/siteContent";
import {
  useCmsAuth,
  type CmsUser,
  type UserRole,
  type UserStatus,
} from "@/lib/cmsAuth";
import {
  getAnalyticsData,
  type AnalyticsSummary,
} from "@/lib/analytics";
import {
  fetchOrders,
  fetchContactMessages,
  updateOrderStatus,
  updateMessageStatus,
  updateOrderPayment,
  COMPLETE_DATABASE_SCHEMA_SQL,
  type OrderRequest,
  type ContactMessage,
} from "@/lib/databaseSchema";
import {
  usePaymentSettings,
  formatMoney,
  fetchPaymentTransactions,
  DEFAULT_PAYMENT_SETTINGS,
  type PaymentSettings,
  type PaymentTransaction,
  type PaymentProvider,
  type PaymentEnvironment,
  type PaymentCurrency,
} from "@/lib/paymentSettings";

export const Route = createFileRoute("/cms")({
  head: () => seo("CMS Admin Studio — Redycakes", "Manage site content, orders, inquiries, web analytics and team access."),
  component: CmsPage,
});

type TabType = "overview" | "analytics" | "content" | "orders" | "messages" | "users" | "payments" | "database";
type ContentSection = "hero" | "cakes" | "trust" | "dietary" | "tasting" | "howItWorks" | "faq" | "about" | "contact";

function CmsPage() {
  const {
    currentUser,
    users,
    loading: authLoading,
    signIn,
    signOut,
    createUser,
    updateUser,
    deleteUser,
    canEditContent,
    canManageUsers,
    isSuperAdmin,
  } = useCmsAuth();

  const { content, updateContent, resetToDefaults } = useSiteContent();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [contentSection, setContentSection] = useState<ContentSection>("hero");

  // Local draft of site content for editing
  const [draftContent, setDraftContent] = useState<SiteContent>(content);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Sync draft when content updates from server/storage
  useEffect(() => {
    setDraftContent(content);
  }, [content]);

  // Analytics state
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30>(7);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);

  // Orders and messages
  const [orders, setOrders] = useState<OrderRequest[]>([]);
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<OrderRequest | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [messageSearch, setMessageSearch] = useState("");
  const [messageStatusFilter, setMessageStatusFilter] = useState<string>("all");

  // User management modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<CmsUser | null>(null);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<UserRole>("editor");
  const [newUserPassword, setNewUserPassword] = useState("");

  // Cake modal for gallery editing
  const [editingCakeIndex, setEditingCakeIndex] = useState<number | null>(null);
  const [cakeModalOpen, setCakeModalOpen] = useState(false);
  const [cakeForm, setCakeForm] = useState<CakeItem>({
    title: "",
    occasion: "Celebration",
    style: "Buttercream",
    src: "/cakes/cake-sample-1.jpg",
    brief: "",
    solution: "",
  });

  // Login form state
  const [loginEmail, setLoginEmail] = useState("admin@redycakes.co.uk");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Payment settings state & draft
  const {
    settings: paymentSettings,
    updateSettings: updatePaymentSettings,
    resetSettings: resetPaymentSettings,
  } = usePaymentSettings();
  const [draftPaymentSettings, setDraftPaymentSettings] = useState<PaymentSettings>(paymentSettings);
  const [hasUnsavedPaymentChanges, setHasUnsavedPaymentChanges] = useState(false);
  const [paymentSection, setPaymentSection] = useState<"gateway" | "bank" | "rules" | "history">("gateway");
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [paymentTransactions, setPaymentTransactions] = useState<PaymentTransaction[]>([]);
  const [showTestCheckoutModal, setShowTestCheckoutModal] = useState(false);

  // Sync draft when payment settings load from server
  useEffect(() => {
    setDraftPaymentSettings(paymentSettings);
  }, [paymentSettings]);

  // Load analytics & data
  useEffect(() => {
    if (!currentUser) return;

    getAnalyticsData(analyticsDays).then(setAnalytics).catch(console.error);
    fetchOrders().then(setOrders).catch(console.error);
    fetchContactMessages().then(setMessages).catch(console.error);
    fetchPaymentTransactions().then(setPaymentTransactions).catch(console.error);
  }, [currentUser, analyticsDays]);

  // Refresh helper
  const refreshData = () => {
    getAnalyticsData(analyticsDays).then(setAnalytics);
    fetchOrders().then(setOrders);
    fetchContactMessages().then(setMessages);
    fetchPaymentTransactions().then(setPaymentTransactions);
  };

  // Payment draft updater
  const updatePaymentDraft = (updater: (prev: PaymentSettings) => PaymentSettings) => {
    setDraftPaymentSettings((prev) => {
      const next = updater(prev);
      setHasUnsavedPaymentChanges(true);
      return next;
    });
  };

  const handleSavePaymentSettings = async () => {
    if (!canManageUsers && !isSuperAdmin) {
      toast.error("Privilege restriction: Only Superadmins and Admins can configure payment keys and bank details.");
      return;
    }
    const ok = await updatePaymentSettings(draftPaymentSettings, currentUser?.email);
    if (ok) {
      setHasUnsavedPaymentChanges(false);
      toast.success("Live payment configuration saved successfully!", {
        description: `Active Gateway: ${draftPaymentSettings.onlinePayments.provider.toUpperCase()} (${draftPaymentSettings.onlinePayments.environment.toUpperCase()} mode)`,
      });
    } else {
      toast.error("Failed to save payment settings. Please try again.");
    }
  };

  const handleResetPaymentSettings = async () => {
    if (!canManageUsers && !isSuperAdmin) {
      toast.error("Privilege restriction: Only Superadmins and Admins can reset payment settings.");
      return;
    }
    if (!confirm("Are you sure you want to reset payment configuration to standard defaults?")) return;
    await resetPaymentSettings(currentUser?.email);
    setDraftPaymentSettings(DEFAULT_PAYMENT_SETTINGS);
    setHasUnsavedPaymentChanges(false);
    toast.info("Payment settings restored to defaults.");
  };

  // Handle draft field changes
  const updateDraft = (updater: (prev: SiteContent) => SiteContent) => {
    setDraftContent((prev) => {
      const next = updater(prev);
      setHasUnsavedChanges(true);
      return next;
    });
  };

  const handleSaveContent = async () => {
    if (!canEditContent) {
      toast.error("You have view-only access. Privilege upgrade required to edit content.");
      return;
    }
    const success = await updateContent(draftContent);
    if (success) {
      setHasUnsavedChanges(false);
      toast.success("Site content published successfully!", {
        description: "Your changes are now live across all pages.",
      });
    } else {
      toast.error("Failed to save changes. Please try again.");
    }
  };

  const handleResetContent = () => {
    if (!confirm("Are you sure you want to reset all site content to original defaults? This cannot be undone.")) return;
    resetToDefaults();
    setDraftContent(defaultSiteContent);
    setHasUnsavedChanges(false);
    toast.info("Site content reset to original defaults.");
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const cakeName = (o as any).cake_name || o.occasion || "";
      const matchSearch =
        o.name.toLowerCase().includes(orderSearch.toLowerCase()) ||
        o.email.toLowerCase().includes(orderSearch.toLowerCase()) ||
        cakeName.toLowerCase().includes(orderSearch.toLowerCase());
      const matchStatus = orderStatusFilter === "all" || o.status.toLowerCase() === orderStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [orders, orderSearch, orderStatusFilter]);

  // Filtered messages
  const filteredMessages = useMemo(() => {
    return messages.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(messageSearch.toLowerCase()) ||
        m.email.toLowerCase().includes(messageSearch.toLowerCase()) ||
        m.message.toLowerCase().includes(messageSearch.toLowerCase());
      const matchStatus = messageStatusFilter === "all" || m.status.toLowerCase() === messageStatusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [messages, messageSearch, messageStatusFilter]);

  const pendingOrdersCount = orders.filter((o) => {
    const s = o.status.toLowerCase();
    return s === "new" || s === "quoted";
  }).length;
  const newMessagesCount = messages.filter((m) => m.status.toLowerCase() === "new").length;

  // Handle Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    const res = await signIn(loginEmail, loginPassword);
    setIsLoggingIn(false);
    if (res.error) {
      setLoginError(res.error);
    } else {
      toast.success("Welcome back to Redycakes CMS!");
    }
  };

  // Quick Admin Login
  const handleQuickAdminLogin = async () => {
    setIsLoggingIn(true);
    setLoginError("");
    const res = await signIn("admin@redycakes.co.uk");
    setIsLoggingIn(false);
    if (res.error) {
      toast.error(res.error);
    } else {
      toast.success("Signed in as Superadmin with full privileges.");
    }
  };

  // If loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-muted-foreground">Loading Redycakes CMS...</p>
        </div>
      </div>
    );
  }

  // Auth Gate
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-primary/5 px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card p-8 shadow-soft backdrop-blur-md">
          <div className="text-center">
            <Link to="/" className="inline-block transition hover:opacity-90">
              <img src="/redycakes_logo.png" alt="Redycakes" className="h-10 mx-auto object-contain" />
            </Link>
            <h1 className="mt-4 font-display text-2xl font-bold text-foreground">CMS Admin Studio</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Sign in with your privileged credentials to manage site content, orders, analytics, and staff.
            </p>
          </div>

          {loginError && (
            <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="admin@redycakes.co.uk"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Password
                </label>
                <span className="text-xs text-muted-foreground">Enter password or use demo</span>
              </div>
              <input
                type="password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full rounded-xl border border-border bg-background px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full btn btn-primary py-3 font-semibold shadow-soft hover:opacity-95 disabled:opacity-50"
            >
              {isLoggingIn ? "Verifying..." : "Sign in to CMS"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-border/80">
            <p className="text-xs text-center text-muted-foreground mb-3">
              Privileged Team Access
            </p>
            <button
              type="button"
              onClick={handleQuickAdminLogin}
              disabled={isLoggingIn}
              className="w-full flex items-center justify-center gap-2 rounded-xl border border-primary/30 bg-primary/10 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary/20"
            >
              <Shield className="h-4 w-4" />
              Sign In as Superadmin (Demo Bootstrap)
            </button>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <Link to="/" className="hover:text-primary transition-colors">
                ← Back to public storefront
              </Link>
              <span>Supabase Connected</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border/80 bg-card/70 backdrop-blur-md p-4 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand & Live Site Link */}
          <div className="flex items-center justify-between pb-4 border-b border-border/80">
            <Link to="/" className="flex items-center gap-2 font-display text-lg font-bold text-foreground">
              <img src="/redycakes_logo.png" alt="Redycakes" className="h-7 w-auto object-contain" />
              <span className="text-xs uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                CMS
              </span>
            </Link>
            <a
              href="/"
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition-colors"
              title="Open storefront in new tab"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          {/* Current User Card */}
          <div className="my-4 p-3 rounded-2xl bg-secondary/40 border border-border/60">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                {currentUser.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate text-foreground">{currentUser.name}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-primary/20 text-primary">
                    {currentUser.role}
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate">{currentUser.email}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("overview")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "overview"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="h-4 w-4" />
                <span>Overview</span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "analytics"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="h-4 w-4" />
                <span>Web Analytics</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/60 text-muted-foreground">
                Live
              </span>
            </button>

            <button
              onClick={() => setActiveTab("content")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "content"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="h-4 w-4" />
                <span>Site Content</span>
              </div>
              {hasUnsavedChanges && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved changes" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "orders"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-4 w-4" />
                <span>Order Requests</span>
              </div>
              {pendingOrdersCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                  {pendingOrdersCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("messages")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "messages"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Mail className="h-4 w-4" />
                <span>Contact Inquiries</span>
              </div>
              {newMessagesCount > 0 && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                  {newMessagesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("users")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "users"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Users className="h-4 w-4" />
                <span>Privileged Users</span>
              </div>
              <span className="text-xs text-muted-foreground">{users.length}</span>
            </button>

            <button
              onClick={() => setActiveTab("payments")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "payments"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-4 w-4" />
                <span>Live Payments</span>
              </div>
              <div className="flex items-center gap-1.5">
                {hasUnsavedPaymentChanges && (
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved payment changes" />
                )}
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase ${
                  draftPaymentSettings.onlinePayments.environment === "live"
                    ? "bg-emerald-500/20 text-emerald-600"
                    : "bg-amber-500/20 text-amber-600"
                }`}>
                  {draftPaymentSettings.onlinePayments.environment}
                </span>
              </div>
            </button>

            <button
              onClick={() => setActiveTab("database")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "database"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Database className="h-4 w-4" />
                <span>Database & SQL</span>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-500" title="Supabase Connected" />
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="pt-4 border-t border-border/80 space-y-2">
          {hasUnsavedChanges && (
            <button
              onClick={handleSaveContent}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 text-white py-2 text-xs font-semibold shadow hover:bg-emerald-700 transition"
            >
              <Save className="h-3.5 w-3.5" />
              Save Site Changes
            </button>
          )}

          {hasUnsavedPaymentChanges && (
            <button
              onClick={handleSavePaymentSettings}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-2 text-xs font-semibold shadow hover:opacity-90 transition"
            >
              <Save className="h-3.5 w-3.5" />
              Save Payment Settings
            </button>
          )}

          <button
            onClick={() => {
              signOut();
              toast.info("You have signed out of CMS.");
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
        {/* OVERVIEW TAB */}
        {activeTab === "overview" && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Studio Overview</h1>
                <p className="text-sm text-muted-foreground">
                  Real-time status of orders, customer inquiries, and storefront visitors.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={refreshData}
                  className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-accent transition"
                >
                  Refresh Data
                </button>
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-primary !py-1.5 !px-3 text-xs inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View Storefront
                </a>
              </div>
            </div>

            {/* Quick KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Pending Orders</span>
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{pendingOrdersCount}</span>
                  <span className="text-xs text-muted-foreground ml-2">/ {orders.length} total</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Requires quote or review</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">New Inquiries</span>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <Mail className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{newMessagesCount}</span>
                  <span className="text-xs text-muted-foreground ml-2">/ {messages.length} total</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Unread contact messages</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Total Views (7d)</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{analytics?.totalViews ?? 0}</span>
                  <span className="text-xs text-muted-foreground ml-2">views</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics?.uniqueVisitors ?? 0} unique visitors
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Conversion Rate</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                    <Sparkles className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-3xl font-bold">{analytics?.conversionRate ?? 0}%</span>
                  <span className="text-xs text-muted-foreground ml-2">order conversion</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Visitors completing order flow</p>
              </div>
            </div>

            {/* Quick Actions & Recent Feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Quick Actions */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-soft">
                <h2 className="text-base font-semibold">CMS Quick Shortcuts</h2>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setActiveTab("content");
                      setContentSection("hero");
                    }}
                    className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">Edit Homepage Hero</p>
                      <p className="text-xs text-muted-foreground">Update headline, badge, and copy</p>
                    </div>
                    <FileText className="h-4 w-4 text-primary" />
                  </button>

                  <button
                    onClick={() => {
                      setActiveTab("content");
                      setContentSection("cakes");
                    }}
                    className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">Manage Cake Gallery</p>
                      <p className="text-xs text-muted-foreground">Add new cakes or update styling</p>
                    </div>
                    <ShoppingBag className="h-4 w-4 text-primary" />
                  </button>

                  <button
                    onClick={() => setActiveTab("users")}
                    className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">Staff & User Management</p>
                      <p className="text-xs text-muted-foreground">Invite team members & assign roles</p>
                    </div>
                    <Users className="h-4 w-4 text-primary" />
                  </button>

                  <button
                    onClick={() => setActiveTab("payments")}
                    className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">Live Payment & Bank Details</p>
                      <p className="text-xs text-muted-foreground">Configure Stripe, Paystack & Faster Payments</p>
                    </div>
                    <CreditCard className="h-4 w-4 text-primary" />
                  </button>

                  <button
                    onClick={() => setActiveTab("database")}
                    className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">Supabase Cloud Sync</p>
                      <p className="text-xs text-muted-foreground">Inspect tables, SQL schema, and RLS</p>
                    </div>
                    <Database className="h-4 w-4 text-emerald-600" />
                  </button>
                </div>
              </div>

              {/* Recent Orders Feed */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Latest Order Enquiries</h2>
                  <button
                    onClick={() => setActiveTab("orders")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-3">
                  {orders.slice(0, 4).map((o) => (
                    <div
                      key={o.id}
                      onClick={() => {
                        setSelectedOrder(o);
                        setActiveTab("orders");
                      }}
                      className="p-3 rounded-xl border border-border/60 hover:border-primary/40 cursor-pointer transition flex items-center justify-between"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold truncate text-foreground">{o.name}</p>
                          <span
                            className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                              o.status.toLowerCase() === "new"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                : o.status.toLowerCase() === "confirmed"
                                ? "bg-emerald-500/20 text-emerald-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {o.status}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {(o as any).cake_name || o.occasion || "Bespoke Cake"} · {o.guests || (o as any).portions || "Custom"} guests
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-primary ml-2">{o.budget || "Custom"}</span>
                    </div>
                  ))}
                  {orders.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No order requests yet.</p>
                  )}
                </div>
              </div>

              {/* Recent Messages Feed */}
              <div className="rounded-2xl border border-border/80 bg-card p-5 space-y-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold">Latest Messages</h2>
                  <button
                    onClick={() => setActiveTab("messages")}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    View All →
                  </button>
                </div>

                <div className="space-y-3">
                  {messages.slice(0, 4).map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setSelectedMessage(m);
                        setActiveTab("messages");
                      }}
                      className="p-3 rounded-xl border border-border/60 hover:border-primary/40 cursor-pointer transition"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold truncate text-foreground">{m.name}</p>
                        <span
                          className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                            m.status.toLowerCase() === "new" ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {m.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{m.message}</p>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No contact messages yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WEB ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-8 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Web Analytics</h1>
                <p className="text-sm text-muted-foreground">
                  Visitor traffic trends, popular pages, conversion metrics, and device breakdowns.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setAnalyticsDays(7)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    analyticsDays === 7
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  Last 7 Days
                </button>
                <button
                  onClick={() => setAnalyticsDays(30)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    analyticsDays === 30
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-foreground hover:bg-accent"
                  }`}
                >
                  Last 30 Days
                </button>
              </div>
            </div>

            {/* Daily Traffic Chart */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-semibold">Storefront Traffic Over Time</h2>
                  <p className="text-xs text-muted-foreground">Daily pageviews and unique visitors</p>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-primary" />
                    <span>Pageviews</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-purple-400" />
                    <span>Unique Visitors</span>
                  </div>
                </div>
              </div>

              <div className="h-72 w-full">
                {analytics && analytics.dailyViews.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={analytics.dailyViews} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="viewsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.0} />
                        </linearGradient>
                        <linearGradient id="visitorsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#c084fc" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#c084fc" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))",
                          borderRadius: "1rem",
                          fontSize: "12px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="views"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fillOpacity={1}
                        fill="url(#viewsGradient)"
                        name="Pageviews"
                      />
                      <Area
                        type="monotone"
                        dataKey="visitors"
                        stroke="#c084fc"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#visitorsGradient)"
                        name="Unique Visitors"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                    Collecting visitor data... Browse site to generate traffic.
                  </div>
                )}
              </div>
            </div>

            {/* Popular Pages and Device Split */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Popular Pages */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft">
                <h2 className="text-base font-semibold mb-1">Top Performing Pages</h2>
                <p className="text-xs text-muted-foreground mb-4">Most visited routes on redycakes.co.uk</p>

                <div className="space-y-3">
                  {analytics?.topPages.map((page, idx) => (
                    <div key={page.path} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-muted-foreground w-4">{idx + 1}.</span>
                        <span className="font-semibold text-foreground truncate">{page.path}</span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span className="font-bold">{page.views} views</span>
                        <span className="text-muted-foreground text-[11px]">{page.uniqueVisitors} visitors</span>
                      </div>
                    </div>
                  ))}
                  {(!analytics || analytics.topPages.length === 0) && (
                    <p className="text-xs text-muted-foreground text-center py-8">No pageview records yet.</p>
                  )}
                </div>
              </div>

              {/* Device Split & Conversion Funnel */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft flex flex-col justify-between">
                <div>
                  <h2 className="text-base font-semibold mb-1">Device Breakdown</h2>
                  <p className="text-xs text-muted-foreground mb-4">Traffic split by visitor device type</p>

                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Laptop className="h-3.5 w-3.5 text-primary" />
                          <span>Desktop</span>
                        </div>
                        <span className="font-bold">{analytics?.deviceSplit.desktop ?? 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${analytics?.deviceSplit.desktop ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Smartphone className="h-3.5 w-3.5 text-purple-500" />
                          <span>Mobile</span>
                        </div>
                        <span className="font-bold">{analytics?.deviceSplit.mobile ?? 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-purple-500 rounded-full transition-all duration-500"
                          style={{ width: `${analytics?.deviceSplit.mobile ?? 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <div className="flex items-center gap-1.5 font-semibold">
                          <Tablet className="h-3.5 w-3.5 text-indigo-500" />
                          <span>Tablet</span>
                        </div>
                        <span className="font-bold">{analytics?.deviceSplit.tablet ?? 0}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${analytics?.deviceSplit.tablet ?? 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Order Form Conversion</span>
                    <span className="font-bold text-emerald-600">{analytics?.conversionRate ?? 0}% conversion</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Live Traffic Log */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft">
              <h2 className="text-base font-semibold mb-1">Real-Time Event Feed</h2>
              <p className="text-xs text-muted-foreground mb-4">Latest recorded visits and interactions</p>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 text-muted-foreground">
                    <tr>
                      <th className="pb-2 font-semibold">Timestamp</th>
                      <th className="pb-2 font-semibold">Route / Page</th>
                      <th className="pb-2 font-semibold">Event</th>
                      <th className="pb-2 font-semibold">Device</th>
                      <th className="pb-2 font-semibold">Referrer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {analytics?.recentEvents.slice(0, 10).map((ev) => (
                      <tr key={ev.id} className="hover:bg-accent/30 transition">
                        <td className="py-2.5 font-mono text-muted-foreground">
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-2.5 font-semibold">{ev.path}</td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                            {ev.event_name}
                          </span>
                        </td>
                        <td className="py-2.5 capitalize">{ev.device}</td>
                        <td className="py-2.5 text-muted-foreground truncate max-w-[200px]">
                          {ev.referrer || "Direct Visit"}
                        </td>
                      </tr>
                    ))}
                    {(!analytics || analytics.recentEvents.length === 0) && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-muted-foreground">
                          No event stream recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* SITE CONTENT TAB */}
        {activeTab === "content" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Site Content Editor</h1>
                <p className="text-sm text-muted-foreground">
                  Update text, images, pricing, FAQs, and dietary menus across the entire storefront.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetContent}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition flex items-center gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveContent}
                  disabled={!hasUnsavedChanges || !canEditContent}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Save className="h-3.5 w-3.5" />
                  Save & Publish
                </button>
              </div>
            </div>

            {/* Section Switcher Tabs */}
            <div className="flex flex-wrap gap-1.5 border-b border-border/80 pb-3">
              {(
                [
                  { id: "hero", label: "Hero & Intro" },
                  { id: "cakes", label: "Cakes & Gallery" },
                  { id: "trust", label: "Trust Pillars" },
                  { id: "dietary", label: "Dietary Menu" },
                  { id: "tasting", label: "Tasting Boxes" },
                  { id: "howItWorks", label: "How It Works" },
                  { id: "faq", label: "FAQs" },
                  { id: "about", label: "Our Story" },
                  { id: "contact", label: "Contact & Footer" },
                ] as const
              ).map((sec) => (
                <button
                  key={sec.id}
                  onClick={() => setContentSection(sec.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                    contentSection === sec.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  {sec.label}
                </button>
              ))}
            </div>

            {/* HERO EDITOR */}
            {contentSection === "hero" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <h2 className="text-base font-semibold">Homepage Hero Section</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Hero Eyebrow / Tagline
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.eyebrow}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, eyebrow: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Badge Text / Turnaround
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.badgeText}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, badgeText: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Headline Lead
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.titleLead}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, titleLead: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">
                      Headline Highlighted Text
                    </label>
                    <input
                      type="text"
                      value={draftContent.hero.titleHighlight}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          hero: { ...prev.hero, titleHighlight: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Intro Paragraph
                  </label>
                  <textarea
                    rows={3}
                    value={draftContent.hero.intro}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        hero: { ...prev.hero, intro: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* CAKES & GALLERY EDITOR */}
            {contentSection === "cakes" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Cakes & Gallery Products</h2>
                    <p className="text-xs text-muted-foreground">
                      Display cakes in gallery with styling notes, occasion, and photo.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingCakeIndex(null);
                      setCakeForm({
                        title: "",
                        occasion: "Celebration",
                        style: "Buttercream",
                        src: "/cakes/cake-sample-1.jpg",
                        brief: "",
                        solution: "",
                      });
                      setCakeModalOpen(true);
                    }}
                    className="btn btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add New Cake
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draftContent.gallery.map((cake, idx) => (
                    <div
                      key={cake.id || idx}
                      className="p-4 rounded-2xl border border-border/70 bg-background flex gap-4 items-start justify-between"
                    >
                      <img
                        src={cake.src}
                        alt={cake.title}
                        className="h-20 w-20 rounded-xl object-cover shrink-0 border border-border/60"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">{cake.title}</p>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            {cake.style}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">{cake.occasion}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{cake.brief || cake.solution}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          onClick={() => {
                            setEditingCakeIndex(idx);
                            setCakeForm(cake);
                            setCakeModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent"
                          title="Edit cake"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (!confirm(`Delete "${cake.title}" from cake gallery?`)) return;
                            updateDraft((prev) => ({
                              ...prev,
                              gallery: prev.gallery.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Delete cake"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TRUST PILLARS */}
            {contentSection === "trust" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <h2 className="text-base font-semibold">Homepage Trust Pillars</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {draftContent.trust.map((tp, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-background space-y-2">
                      <span className="text-xs font-bold text-primary">Pillar #{idx + 1}</span>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Title</label>
                        <input
                          type="text"
                          value={tp.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateDraft((prev) => {
                              const list = [...prev.trust];
                              list[idx] = { ...list[idx], title: val };
                              return { ...prev, trust: list };
                            });
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-sm font-semibold"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground">Description</label>
                        <textarea
                          rows={3}
                          value={tp.text}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateDraft((prev) => {
                              const list = [...prev.trust];
                              list[idx] = { ...list[idx], text: val };
                              return { ...prev, trust: list };
                            });
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DIETARY MENU */}
            {contentSection === "dietary" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <h2 className="text-base font-semibold">Dietary-Friendly Options</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {draftContent.dietary.categories.map((dc, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={dc.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateDraft((prev) => {
                              const list = [...prev.dietary.categories];
                              list[idx] = { ...list[idx], name: val };
                              return { ...prev, dietary: { ...prev.dietary, categories: list } };
                            });
                          }}
                          className="font-bold text-sm bg-transparent border-b border-border/80 pb-0.5 focus:border-primary outline-none"
                        />
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          Option #{idx + 1}
                        </span>
                      </div>
                      <textarea
                        rows={3}
                        value={dc.how}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraft((prev) => {
                            const list = [...prev.dietary.categories];
                            list[idx] = { ...list[idx], how: val };
                            return { ...prev, dietary: { ...prev.dietary, categories: list } };
                          });
                        }}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TASTING BOXES */}
            {contentSection === "tasting" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <h2 className="text-base font-semibold">Tasting Boxes Product Info</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Box Title</label>
                    <input
                      type="text"
                      value={draftContent.tasting.title}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          tasting: { ...prev.tasting, title: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Intro</label>
                    <input
                      type="text"
                      value={draftContent.tasting.intro}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          tasting: { ...prev.tasting, intro: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Special Note / Dispatch</label>
                  <input
                    type="text"
                    value={draftContent.tasting.note}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        tasting: { ...prev.tasting, note: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  />
                </div>
              </div>
            )}

            {/* HOW IT WORKS */}
            {contentSection === "howItWorks" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <h2 className="text-base font-semibold">5-Step Ordering Process</h2>
                <div className="space-y-3">
                  {draftContent.howItWorks.steps.map((st, idx) => (
                    <div key={idx} className="p-3 rounded-xl border border-border bg-background flex gap-3 items-start">
                      <span className="h-7 w-7 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          value={st.t}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateDraft((prev) => {
                              const list = [...prev.howItWorks.steps];
                              list[idx] = { ...list[idx], t: val };
                              return { ...prev, howItWorks: { ...prev.howItWorks, steps: list } };
                            });
                          }}
                          className="font-bold text-sm w-full bg-transparent border-b border-border/80 pb-0.5 focus:border-primary outline-none"
                        />
                        <textarea
                          rows={2}
                          value={st.d}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateDraft((prev) => {
                              const list = [...prev.howItWorks.steps];
                              list[idx] = { ...list[idx], d: val };
                              return { ...prev, howItWorks: { ...prev.howItWorks, steps: list } };
                            });
                          }}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FAQS */}
            {contentSection === "faq" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-base font-semibold">Frequently Asked Questions</h2>
                    <p className="text-xs text-muted-foreground">Manage customer questions on the FAQ route.</p>
                  </div>
                  <button
                    onClick={() => {
                      updateDraft((prev) => ({
                        ...prev,
                        faq: [...prev.faq, { q: "New Question Title", a: "Helpful answer to the customer inquiry." }],
                      }));
                    }}
                    className="btn btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add FAQ
                  </button>
                </div>

                <div className="space-y-3">
                  {draftContent.faq.map((item, idx) => (
                    <div key={idx} className="p-4 rounded-xl border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <input
                          type="text"
                          value={item.q}
                          onChange={(e) => {
                            const val = e.target.value;
                            updateDraft((prev) => {
                              const list = [...prev.faq];
                              list[idx] = { ...list[idx], q: val };
                              return { ...prev, faq: list };
                            });
                          }}
                          className="font-semibold text-sm w-full bg-transparent border-b border-border/80 pb-0.5 focus:border-primary outline-none"
                        />
                        <button
                          onClick={() => {
                            updateDraft((prev) => ({
                              ...prev,
                              faq: prev.faq.filter((_, i) => i !== idx),
                            }));
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-destructive"
                          title="Delete FAQ"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={item.a}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraft((prev) => {
                            const list = [...prev.faq];
                            list[idx] = { ...list[idx], a: val };
                            return { ...prev, faq: list };
                          });
                        }}
                        className="w-full rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* OUR STORY / ABOUT */}
            {contentSection === "about" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <h2 className="text-base font-semibold">Our Story & About Page</h2>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">About Title</label>
                  <input
                    type="text"
                    value={draftContent.about.title}
                    onChange={(e) =>
                      updateDraft((prev) => ({
                        ...prev,
                        about: { ...prev.about, title: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Story Paragraphs</label>
                  <div className="space-y-2 mt-1">
                    {draftContent.about.paragraphs.map((p, idx) => (
                      <textarea
                        key={idx}
                        rows={3}
                        value={p}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraft((prev) => {
                            const list = [...prev.about.paragraphs];
                            list[idx] = val;
                            return { ...prev, about: { ...prev.about, paragraphs: list } };
                          });
                        }}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground"
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* CONTACT & FOOTER */}
            {contentSection === "contact" && (
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                <h2 className="text-base font-semibold">Studio Contact & Footer Information</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                    <input
                      type="email"
                      value={draftContent.contact.email}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, email: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">WhatsApp Number (e.g. 447123456789)</label>
                    <input
                      type="text"
                      value={draftContent.contact.whatsapp}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, whatsapp: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Service & Delivery Area</label>
                    <input
                      type="text"
                      value={draftContent.contact.serviceArea}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, serviceArea: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Reply Guarantee Time</label>
                    <input
                      type="text"
                      value={draftContent.contact.replyPromise}
                      onChange={(e) =>
                        updateDraft((prev) => ({
                          ...prev,
                          contact: { ...prev.contact, replyPromise: e.target.value },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-border/80">
                  <h3 className="text-sm font-semibold mb-3">Global Call-to-Action Banner</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">CTA Headline</label>
                      <input
                        type="text"
                        value={draftContent.cta.title}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, title: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">CTA Subtitle</label>
                      <input
                        type="text"
                        value={draftContent.cta.text}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            cta: { ...prev.cta, text: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ORDERS MANAGEMENT TAB */}
        {activeTab === "orders" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Cake Order Requests</h1>
                <p className="text-sm text-muted-foreground">
                  Review custom cake submissions, calculate quotes, and update order statuses.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-secondary text-foreground">
                {orders.length} total orders
              </span>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search by customer name, email, or cake..."
                  className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2 text-sm focus:border-primary outline-none"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {["all", "new", "quoted", "confirmed", "baking", "completed", "archived"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setOrderStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition ${
                      orderStatusFilter === st
                        ? "bg-primary text-primary-foreground"
                        : "border border-border bg-card text-foreground hover:bg-accent"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Orders Table */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-secondary/30 text-muted-foreground">
                    <tr>
                      <th className="p-3.5 font-semibold">Date</th>
                      <th className="p-3.5 font-semibold">Customer</th>
                      <th className="p-3.5 font-semibold">Cake & Guests</th>
                      <th className="p-3.5 font-semibold">Event Date</th>
                      <th className="p-3.5 font-semibold">Budget / Quote</th>
                      <th className="p-3.5 font-semibold">Payment</th>
                      <th className="p-3.5 font-semibold">Status</th>
                      <th className="p-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredOrders.map((o) => (
                      <tr key={o.id} className="hover:bg-accent/30 transition">
                        <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(o.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-foreground">{o.name}</p>
                          <p className="text-[11px] text-muted-foreground">{o.email}</p>
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-foreground">{(o as any).cake_name || o.occasion || "Bespoke Cake"}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {o.guests || (o as any).portions || "Custom"} guests · {(o.flavours && o.flavours.length > 0 ? o.flavours.join(", ") : (o as any).flavour) || "Selected flavours"}
                          </p>
                        </td>
                        <td className="p-3.5 whitespace-nowrap font-medium text-foreground">
                          {o.event_date || (o as any).date || "Not set"}
                        </td>
                        <td className="p-3.5">
                          <p className="font-semibold text-foreground">{o.budget || "Custom"}</p>
                          {o.quote_amount && (
                            <p className="text-[11px] font-bold text-primary">
                              Quote: {formatMoney(o.quote_amount, draftPaymentSettings.currency)}
                            </p>
                          )}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              o.payment_status === "Paid in Full"
                                ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                : o.payment_status === "Deposit Paid"
                                ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                                : o.payment_status === "Pending Verification"
                                ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {o.payment_status || "Unpaid"}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={o.status}
                            onChange={async (e) => {
                              const newSt = e.target.value as OrderRequest["status"];
                              await updateOrderStatus(o.id, newSt);
                              setOrders((prev) =>
                                prev.map((item) => (item.id === o.id ? { ...item, status: newSt } : item))
                              );
                              toast.success(`Order #${o.id.slice(0, 8)} updated to ${newSt}`);
                            }}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold focus:border-primary outline-none"
                          >
                            <option value="New">New</option>
                            <option value="Quoted">Quoted</option>
                            <option value="Confirmed">Confirmed</option>
                            <option value="Baking">Baking</option>
                            <option value="Completed">Completed</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedOrder(o)}
                            className="p-1.5 rounded-lg border border-border/80 hover:bg-accent text-foreground transition text-xs font-medium"
                          >
                            View & Price
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredOrders.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">
                          No order requests matching filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* CONTACT MESSAGES TAB */}
        {activeTab === "messages" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Contact Inquiries</h1>
                <p className="text-sm text-muted-foreground">
                  Direct questions, feedback, and customer messages submitted through the contact page.
                </p>
              </div>
              <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-secondary text-foreground">
                {messages.length} inquiries
              </span>
            </div>

            {/* Messages Table */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-secondary/30 text-muted-foreground">
                    <tr>
                      <th className="p-3.5 font-semibold">Date</th>
                      <th className="p-3.5 font-semibold">Sender</th>
                      <th className="p-3.5 font-semibold">Message</th>
                      <th className="p-3.5 font-semibold">Status</th>
                      <th className="p-3.5 font-semibold text-right">Quick Contact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {filteredMessages.map((m) => (
                      <tr key={m.id} className="hover:bg-accent/30 transition">
                        <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">
                          {new Date(m.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                        </td>
                        <td className="p-3.5">
                          <p className="font-bold text-foreground">{m.name}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                          {(m as any).phone && <p className="text-[11px] text-muted-foreground">{(m as any).phone}</p>}
                        </td>
                        <td className="p-3.5">
                          <p className="text-foreground leading-relaxed line-clamp-3">{m.message}</p>
                        </td>
                        <td className="p-3.5">
                          <select
                            value={m.status}
                            onChange={async (e) => {
                              const newSt = e.target.value as ContactMessage["status"];
                              await updateMessageStatus(m.id, newSt);
                              setMessages((prev) =>
                                prev.map((item) => (item.id === m.id ? { ...item, status: newSt } : item))
                              );
                              toast.success("Message status updated.");
                            }}
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs font-semibold focus:border-primary outline-none"
                          >
                            <option value="New">New</option>
                            <option value="Replied">Replied</option>
                            <option value="Archived">Archived</option>
                          </select>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            {(m as any).phone && (
                              <a
                                href={`https://wa.me/${(m as any).phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                                  `Hi ${m.name}, thank you for contacting Redycakes!`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                                title="Reply on WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <a
                              href={`mailto:${m.email}?subject=${encodeURIComponent(
                                "Redycakes Cake Studio Inquiry"
                              )}&body=${encodeURIComponent(`Hi ${m.name},\n\nThank you for reaching out to Redycakes!\n\n`)}`}
                              className="p-1.5 rounded-lg border border-border hover:bg-accent text-foreground"
                              title="Reply by Email"
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMessages.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-muted-foreground">
                          No messages found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PRIVILEGED USERS TAB */}
        {activeTab === "users" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-display font-bold">Privileged User Management</h1>
                <p className="text-sm text-muted-foreground">
                  Grant team members access to the CMS, configure roles, and revoke permissions.
                </p>
              </div>
              {canManageUsers && (
                <button
                  onClick={() => setShowAddUserModal(true)}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Privileged User
                </button>
              )}
            </div>

            {/* Users Table */}
            <div className="rounded-2xl border border-border/80 bg-card shadow-soft overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border/80 bg-secondary/30 text-muted-foreground">
                    <tr>
                      <th className="p-3.5 font-semibold">User</th>
                      <th className="p-3.5 font-semibold">Role</th>
                      <th className="p-3.5 font-semibold">Status</th>
                      <th className="p-3.5 font-semibold">Added On</th>
                      <th className="p-3.5 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-accent/30 transition">
                        <td className="p-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-foreground">{u.name}</p>
                              <p className="text-[11px] text-muted-foreground">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              u.role === "superadmin"
                                ? "bg-purple-500/20 text-purple-700 dark:text-purple-300"
                                : u.role === "admin"
                                ? "bg-primary/20 text-primary"
                                : u.role === "editor"
                                ? "bg-emerald-500/20 text-emerald-700"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              u.status === "active"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-3.5 text-muted-foreground whitespace-nowrap">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          {canManageUsers && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setEditingUser(u)}
                                className="p-1.5 rounded-lg border border-border/80 hover:bg-accent text-foreground"
                                title="Edit Role & Status"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                              {u.id !== currentUser.id && (
                                <button
                                  onClick={async () => {
                                    if (!confirm(`Are you sure you want to revoke access for ${u.name}?`)) return;
                                    const res = await deleteUser(u.id);
                                    if (res.error) toast.error(res.error);
                                    else toast.success(`User ${u.name} removed.`);
                                  }}
                                  className="p-1.5 rounded-lg border border-destructive/20 text-destructive hover:bg-destructive/10"
                                  title="Revoke User"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* LIVE PAYMENTS TAB */}
        {activeTab === "payments" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header & Main Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">Live Payments & Banking</h1>
                  <span
                    className={`text-xs uppercase font-extrabold px-2.5 py-0.5 rounded-full ${
                      draftPaymentSettings.onlinePayments.environment === "live"
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                    }`}
                  >
                    {draftPaymentSettings.onlinePayments.environment} mode
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage live checkout gateways, public API keys, UK Faster Payments accounts, and customer deposit policies.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestCheckoutModal(true)}
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent text-foreground transition flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Preview Checkout</span>
                </button>

                <a
                  href="/pay"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-accent text-foreground transition flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open /pay</span>
                </a>

                {canManageUsers || isSuperAdmin ? (
                  <>
                    <button
                      type="button"
                      onClick={handleResetPaymentSettings}
                      className="rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10 px-3 py-1.5 text-xs font-semibold transition"
                    >
                      Reset Defaults
                    </button>
                    <button
                      type="button"
                      onClick={handleSavePaymentSettings}
                      disabled={!hasUnsavedPaymentChanges}
                      className="btn btn-primary !py-1.5 !px-4 text-xs font-bold flex items-center gap-1.5 shadow-soft disabled:opacity-50"
                    >
                      <Save className="h-3.5 w-3.5" />
                      <span>Save Changes</span>
                    </button>
                  </>
                ) : null}
              </div>
            </div>

            {/* Privilege Gate Alert if Non-Privileged */}
            {(!canManageUsers && !isSuperAdmin) && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
                <ShieldAlert className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-bold text-sm">Privileged Access Required for Changes</p>
                  <p className="mt-0.5">
                    You are logged in with an Editor/Viewer role. Viewing and configuring live payment keys, secret tokens, and official studio bank accounts is restricted to Administrators and Superadmins.
                  </p>
                </div>
              </div>
            )}

            {/* Top Status Summary KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Active Gateway</span>
                  <div className="p-2 rounded-xl bg-primary/10 text-primary">
                    <CreditCard className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold capitalize">
                    {draftPaymentSettings.onlinePayments.enabled
                      ? draftPaymentSettings.onlinePayments.provider
                      : "Disabled"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({draftPaymentSettings.onlinePayments.environment})
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Instant card processing</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">UK Bank Transfer</span>
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                    <Building2 className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold">
                    {draftPaymentSettings.bankTransfer.enabled ? "Active" : "Disabled"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">Faster Payments</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Sort: {draftPaymentSettings.bankTransfer.sortCode}
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Deposit Policy</span>
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold">
                    {draftPaymentSettings.depositRules.depositPercentage}%
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">to secure date</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Tasting Box: {formatMoney(draftPaymentSettings.depositRules.tastingBoxPrice, draftPaymentSettings.currency)}
                </p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase text-muted-foreground">Logged Transactions</span>
                  <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                    <Wallet className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-2xl font-bold">{paymentTransactions.length}</span>
                  <span className="text-xs text-muted-foreground ml-2">payments</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Processed transactions</p>
              </div>
            </div>

            {/* Sub-tabs Navigation */}
            <div className="flex rounded-2xl bg-secondary/50 p-1 border border-border/70 overflow-x-auto">
              <button
                type="button"
                onClick={() => setPaymentSection("gateway")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  paymentSection === "gateway"
                    ? "bg-card text-foreground shadow-soft border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5 text-primary" />
                <span>Online Card Gateway</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentSection("bank")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  paymentSection === "bank"
                    ? "bg-card text-foreground shadow-soft border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>Bank Transfer (Faster Payments)</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentSection("rules")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  paymentSection === "rules"
                    ? "bg-card text-foreground shadow-soft border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                <span>Deposit Rules & Policies</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentSection("history")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                  paymentSection === "history"
                    ? "bg-card text-foreground shadow-soft border border-border/80"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Wallet className="h-3.5 w-3.5 text-blue-600" />
                <span>Transactions Log ({paymentTransactions.length})</span>
              </button>
            </div>

            {/* SECTION 1: ONLINE CARD GATEWAY */}
            {paymentSection === "gateway" && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
                  <div>
                    <h2 className="text-base font-semibold">Online Card Checkout Configuration</h2>
                    <p className="text-xs text-muted-foreground">
                      Enable customers to pay cake deposits or tasting boxes online instantly with Visa, Mastercard, AMEX, Apple Pay and Google Pay.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-muted-foreground">Gateway Active:</label>
                    <button
                      type="button"
                      disabled={!canManageUsers && !isSuperAdmin}
                      onClick={() =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          onlinePayments: {
                            ...prev.onlinePayments,
                            enabled: !prev.onlinePayments.enabled,
                          },
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        draftPaymentSettings.onlinePayments.enabled ? "bg-emerald-600" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draftPaymentSettings.onlinePayments.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {/* Provider Selector */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Payment Provider / Gateway
                    </label>
                    <select
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.onlinePayments.provider}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          onlinePayments: {
                            ...prev.onlinePayments,
                            provider: e.target.value as PaymentProvider,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                    >
                      <option value="stripe">Stripe (Global Cards, Apple Pay, Google Pay)</option>
                      <option value="paystack">Paystack (Cards, Bank Transfer, USSD)</option>
                      <option value="custom_link">Custom Hosted Checkout (Stripe Payment Link / Page)</option>
                    </select>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Recommended: Stripe for UK and international cake orders.
                    </p>
                  </div>

                  {/* Environment Selector */}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Gateway Environment
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!canManageUsers && !isSuperAdmin}
                        onClick={() =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            onlinePayments: {
                              ...prev.onlinePayments,
                              environment: "live",
                            },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          draftPaymentSettings.onlinePayments.environment === "live"
                            ? "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                            : "border-border hover:bg-accent text-muted-foreground"
                        }`}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Live Mode (Real Cards)</span>
                      </button>

                      <button
                        type="button"
                        disabled={!canManageUsers && !isSuperAdmin}
                        onClick={() =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            onlinePayments: {
                              ...prev.onlinePayments,
                              environment: "test",
                            },
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                          draftPaymentSettings.onlinePayments.environment === "test"
                            ? "border-amber-500 bg-amber-500/15 text-amber-700 dark:text-amber-300"
                            : "border-border hover:bg-accent text-muted-foreground"
                        }`}
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                        <span>Test / Sandbox Mode</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* API Key Fields based on provider */}
                {draftPaymentSettings.onlinePayments.provider === "stripe" && (
                  <div className="space-y-4 pt-2 border-t border-border/80">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Stripe Publishable API Key *
                        </label>
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Must begin with <code className="text-primary font-bold">pk_live_</code> or <code className="text-amber-600 font-bold">pk_test_</code>
                        </span>
                      </div>
                      <input
                        type="text"
                        disabled={!canManageUsers && !isSuperAdmin}
                        value={draftPaymentSettings.onlinePayments.stripePublicKey}
                        onChange={(e) =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            onlinePayments: {
                              ...prev.onlinePayments,
                              stripePublicKey: e.target.value.trim(),
                            },
                          }))
                        }
                        placeholder="pk_live_..."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-muted-foreground">
                          Stripe Secret Key (Optional / Backend Webhook Sync)
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1"
                        >
                          {showSecretKey ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          <span>{showSecretKey ? "Hide Secret" : "Show Secret"}</span>
                        </button>
                      </div>
                      <input
                        type={showSecretKey ? "text" : "password"}
                        disabled={!canManageUsers && !isSuperAdmin}
                        value={draftPaymentSettings.onlinePayments.stripeSecretKey || ""}
                        onChange={(e) =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            onlinePayments: {
                              ...prev.onlinePayments,
                              stripeSecretKey: e.target.value.trim(),
                            },
                          }))
                        }
                        placeholder="sk_live_••••••••"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Bank Statement Descriptor
                      </label>
                      <input
                        type="text"
                        maxLength={22}
                        disabled={!canManageUsers && !isSuperAdmin}
                        value={draftPaymentSettings.onlinePayments.statementDescriptor}
                        onChange={(e) =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            onlinePayments: {
                              ...prev.onlinePayments,
                              statementDescriptor: e.target.value.toUpperCase(),
                            },
                          }))
                        }
                        placeholder="REDYCAKES BAKERY"
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono uppercase focus:border-primary outline-none"
                      />
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Appears on customer's credit card or bank statement (up to 22 characters).
                      </p>
                    </div>
                  </div>
                )}

                {draftPaymentSettings.onlinePayments.provider === "paystack" && (
                  <div className="space-y-4 pt-2 border-t border-border/80">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground block mb-1">
                        Paystack Public Key *
                      </label>
                      <input
                        type="text"
                        disabled={!canManageUsers && !isSuperAdmin}
                        value={draftPaymentSettings.onlinePayments.paystackPublicKey}
                        onChange={(e) =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            onlinePayments: {
                              ...prev.onlinePayments,
                              paystackPublicKey: e.target.value.trim(),
                            },
                          }))
                        }
                        placeholder="pk_live_..."
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Hosted Payment Link */}
                <div className="pt-2 border-t border-border/80">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Direct Hosted Payment Link (Stripe Payment Link / Paystack Page URL)
                  </label>
                  <input
                    type="url"
                    disabled={!canManageUsers && !isSuperAdmin}
                    value={draftPaymentSettings.onlinePayments.customPaymentLink}
                    onChange={(e) =>
                      updatePaymentDraft((prev) => ({
                        ...prev,
                        onlinePayments: {
                          ...prev.onlinePayments,
                          customPaymentLink: e.target.value.trim(),
                        },
                      }))
                    }
                    placeholder="https://buy.stripe.com/..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none font-mono"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Create a payment link in your Stripe Dashboard and paste it here if you prefer directing customers to a Stripe-hosted checkout.
                  </p>
                </div>

                {/* Currency Selection */}
                <div className="pt-2 border-t border-border/80">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Storefront Settlement Currency
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { code: "GBP", name: "British Pound (£)" },
                      { code: "EUR", name: "Euro (€)" },
                      { code: "USD", name: "US Dollar ($)" },
                      { code: "NGN", name: "Nigerian Naira (₦)" },
                    ].map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        disabled={!canManageUsers && !isSuperAdmin}
                        onClick={() =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            currency: c.code as PaymentCurrency,
                          }))
                        }
                        className={`p-2.5 rounded-xl border text-xs font-bold transition text-left ${
                          draftPaymentSettings.currency === c.code
                            ? "border-primary bg-primary/10 text-primary shadow-soft"
                            : "border-border hover:bg-accent text-foreground"
                        }`}
                      >
                        <p className="font-extrabold">{c.code}</p>
                        <p className="text-[11px] text-muted-foreground font-normal">{c.name}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: DIRECT BANK TRANSFER */}
            {paymentSection === "bank" && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border/80">
                  <div>
                    <h2 className="text-base font-semibold">UK Faster Payments Bank Transfer Details</h2>
                    <p className="text-xs text-muted-foreground">
                      Configure official bank details shown to clients on quotes, invoices, and during checkout.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="text-xs font-semibold text-muted-foreground">Bank Transfer Active:</label>
                    <button
                      type="button"
                      disabled={!canManageUsers && !isSuperAdmin}
                      onClick={() =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          bankTransfer: {
                            ...prev.bankTransfer,
                            enabled: !prev.bankTransfer.enabled,
                          },
                        }))
                      }
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        draftPaymentSettings.bankTransfer.enabled ? "bg-emerald-600" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          draftPaymentSettings.bankTransfer.enabled ? "translate-x-6" : "translate-x-1"
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.bankTransfer.bankName}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, bankName: e.target.value },
                        }))
                      }
                      placeholder="e.g. Barclays Bank UK or Starling Bank"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Account Name *
                    </label>
                    <input
                      type="text"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.bankTransfer.accountName}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, accountName: e.target.value },
                        }))
                      }
                      placeholder="e.g. Redycakes Ltd"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Sort Code (XX-XX-XX) *
                    </label>
                    <input
                      type="text"
                      maxLength={8}
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.bankTransfer.sortCode}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, sortCode: e.target.value },
                        }))
                      }
                      placeholder="20-04-15"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Account Number (8 digits) *
                    </label>
                    <input
                      type="text"
                      maxLength={10}
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.bankTransfer.accountNumber}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, accountNumber: e.target.value.replace(/\D/g, "") },
                        }))
                      }
                      placeholder="83920147"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      IBAN (Optional / International Clients)
                    </label>
                    <input
                      type="text"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.bankTransfer.iban || ""}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, iban: e.target.value.toUpperCase() },
                        }))
                      }
                      placeholder="GB33BARC20041583920147"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono uppercase focus:border-primary outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      BIC / SWIFT (Optional)
                    </label>
                    <input
                      type="text"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.bankTransfer.swiftBic || ""}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          bankTransfer: { ...prev.bankTransfer, swiftBic: e.target.value.toUpperCase() },
                        }))
                      }
                      placeholder="BARCGB22"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono uppercase focus:border-primary outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Payment Reference Prefix
                  </label>
                  <input
                    type="text"
                    maxLength={10}
                    disabled={!canManageUsers && !isSuperAdmin}
                    value={draftPaymentSettings.bankTransfer.referencePrefix}
                    onChange={(e) =>
                      updatePaymentDraft((prev) => ({
                        ...prev,
                        bankTransfer: { ...prev.bankTransfer, referencePrefix: e.target.value.toUpperCase() },
                      }))
                    }
                    placeholder="RCK-"
                    className="w-48 rounded-xl border border-border bg-background px-3 py-2 text-sm font-mono uppercase focus:border-primary outline-none"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    e.g. Order #1234 will be given reference <code className="font-mono text-primary font-bold">{draftPaymentSettings.bankTransfer.referencePrefix}1234</code>.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Reference Instructions for Customers
                  </label>
                  <textarea
                    rows={2}
                    disabled={!canManageUsers && !isSuperAdmin}
                    value={draftPaymentSettings.bankTransfer.referenceInstructions}
                    onChange={(e) =>
                      updatePaymentDraft((prev) => ({
                        ...prev,
                        bankTransfer: { ...prev.bankTransfer, referenceInstructions: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground focus:border-primary outline-none"
                  />
                </div>

                {/* Customer View Live Preview Card */}
                <div className="pt-4 border-t border-border/80">
                  <h3 className="text-xs font-bold uppercase text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Eye className="h-3.5 w-3.5 text-primary" />
                    Customer View Preview (How it looks on /pay):
                  </h3>

                  <div className="max-w-md rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-2.5">
                    <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
                      <span className="text-muted-foreground">Bank Name</span>
                      <span className="font-bold text-foreground">{draftPaymentSettings.bankTransfer.bankName}</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Account Name</span>
                        <span className="font-bold text-foreground">{draftPaymentSettings.bankTransfer.accountName}</span>
                      </div>
                      <span className="text-[10px] text-primary border border-primary/30 px-2 py-0.5 rounded font-bold">Copy</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Sort Code</span>
                        <span className="font-mono font-bold text-primary">{draftPaymentSettings.bankTransfer.sortCode}</span>
                      </div>
                      <span className="text-[10px] text-primary border border-primary/30 px-2 py-0.5 rounded font-bold">Copy</span>
                    </div>

                    <div className="flex items-center justify-between pb-2 border-b border-border/60 text-xs">
                      <div>
                        <span className="text-muted-foreground block text-[11px]">Account Number</span>
                        <span className="font-mono font-bold text-primary">{draftPaymentSettings.bankTransfer.accountNumber}</span>
                      </div>
                      <span className="text-[10px] text-primary border border-primary/30 px-2 py-0.5 rounded font-bold">Copy</span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        <span className="text-amber-600 dark:text-amber-400 font-bold block text-[11px]">Reference:</span>
                        <span className="font-mono font-extrabold text-foreground">{draftPaymentSettings.bankTransfer.referencePrefix}SAMPLE</span>
                      </div>
                      <span className="text-[10px] bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded font-bold">Copy Ref</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 3: DEPOSIT RULES & POLICIES */}
            {paymentSection === "rules" && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-6 animate-in fade-in duration-200">
                <div className="pb-4 border-b border-border/80">
                  <h2 className="text-base font-semibold">Deposit Calculation & Booking Rules</h2>
                  <p className="text-xs text-muted-foreground">
                    Define deposit percentages, tasting box pricing, and customer terms.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Default Deposit Percentage (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="10"
                        max="100"
                        disabled={!canManageUsers && !isSuperAdmin}
                        value={draftPaymentSettings.depositRules.depositPercentage}
                        onChange={(e) =>
                          updatePaymentDraft((prev) => ({
                            ...prev,
                            depositRules: {
                              ...prev.depositRules,
                              depositPercentage: parseInt(e.target.value) || 50,
                            },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary outline-none"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-muted-foreground font-bold">%</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Typically 50% to secure event date in calendar.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Tasting Box Flat Price ({draftPaymentSettings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.depositRules.tastingBoxPrice}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          depositRules: {
                            ...prev.depositRules,
                            tastingBoxPrice: parseFloat(e.target.value) || 25,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold text-primary focus:border-primary outline-none"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Charged 100% upfront on order.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Balance Due (Days Before Event)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.depositRules.balanceDueDaysBefore}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          depositRules: {
                            ...prev.depositRules,
                            balanceDueDaysBefore: parseInt(e.target.value) || 7,
                          },
                        }))
                      }
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-bold focus:border-primary outline-none"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      e.g. 7 days prior to collection or delivery.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/80">
                  <label className="text-xs font-semibold text-muted-foreground block mb-1">
                    Deposit Policy & Cancellation Terms (Shown to Customers)
                  </label>
                  <textarea
                    rows={3}
                    disabled={!canManageUsers && !isSuperAdmin}
                    value={draftPaymentSettings.depositRules.depositPolicyNotice}
                    onChange={(e) =>
                      updatePaymentDraft((prev) => ({
                        ...prev,
                        depositRules: { ...prev.depositRules, depositPolicyNotice: e.target.value },
                      }))
                    }
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-muted-foreground focus:border-primary outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border/80">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      WhatsApp Transfer Proof Number
                    </label>
                    <input
                      type="text"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.notifications.whatsappNumber}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, whatsappNumber: e.target.value },
                        }))
                      }
                      placeholder="447911123456"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Customers can 1-click message their transfer screenshot directly to this number.
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-muted-foreground block mb-1">
                      Billing & Accounts Notification Email
                    </label>
                    <input
                      type="email"
                      disabled={!canManageUsers && !isSuperAdmin}
                      value={draftPaymentSettings.notifications.billingEmail}
                      onChange={(e) =>
                        updatePaymentDraft((prev) => ({
                          ...prev,
                          notifications: { ...prev.notifications, billingEmail: e.target.value },
                        }))
                      }
                      placeholder="accounts@redycakes.co.uk"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 4: TRANSACTIONS AUDIT LOG */}
            {paymentSection === "history" && (
              <div className="rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold">Payment Transactions & Audit Log</h2>
                    <p className="text-xs text-muted-foreground">
                      Real-time log of customer card authorizations, Faster Payments transfer notifications, and receipts.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fetchPaymentTransactions().then(setPaymentTransactions)}
                    className="rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-semibold hover:bg-accent text-foreground transition"
                  >
                    Refresh Log
                  </button>
                </div>

                <div className="rounded-2xl border border-border/80 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-border/80 bg-secondary/30 text-muted-foreground">
                        <tr>
                          <th className="p-3.5 font-semibold">Date & Time</th>
                          <th className="p-3.5 font-semibold">Customer</th>
                          <th className="p-3.5 font-semibold">Amount</th>
                          <th className="p-3.5 font-semibold">Method</th>
                          <th className="p-3.5 font-semibold">Reference</th>
                          <th className="p-3.5 font-semibold">Status</th>
                          <th className="p-3.5 font-semibold">Notes</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {paymentTransactions.map((tx) => (
                          <tr key={tx.id} className="hover:bg-accent/30 transition">
                            <td className="p-3.5 font-mono text-muted-foreground whitespace-nowrap">
                              {new Date(tx.created_at).toLocaleString([], {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="p-3.5">
                              <p className="font-bold text-foreground">{tx.customer_name}</p>
                              <p className="text-[11px] text-muted-foreground">{tx.customer_email}</p>
                            </td>
                            <td className="p-3.5 font-bold text-primary whitespace-nowrap">
                              {formatMoney(tx.amount, (tx.currency as PaymentCurrency) || draftPaymentSettings.currency)}
                            </td>
                            <td className="p-3.5 whitespace-nowrap capitalize font-medium">
                              {tx.method === "card" ? "💳 Card" : "🏦 Bank Transfer"}
                            </td>
                            <td className="p-3.5 font-mono text-xs font-bold text-foreground">
                              {tx.reference}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span
                                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                  tx.status === "completed"
                                    ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                    : tx.status === "pending"
                                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                                    : "bg-destructive/15 text-destructive"
                                }`}
                              >
                                {tx.status}
                              </span>
                            </td>
                            <td className="p-3.5 text-muted-foreground text-[11px] max-w-xs truncate">
                              {tx.notes || "—"}
                            </td>
                          </tr>
                        ))}
                        {paymentTransactions.length === 0 && (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-muted-foreground">
                              No payment transactions recorded yet. Test transactions will appear here automatically.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DATABASE & SQL TAB */}
        {activeTab === "database" && (
          <div className="space-y-6 max-w-5xl mx-auto">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold">Supabase Database & Cloud Settings</h1>
              <p className="text-sm text-muted-foreground">
                Configured with project ID <code className="bg-secondary px-1.5 py-0.5 rounded">coblvntmcbnyardnsrcs</code>.
              </p>
            </div>

            {/* Connection Status Card */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse" />
                  <div>
                    <h2 className="text-base font-semibold">Active Database Integration</h2>
                    <p className="text-xs text-muted-foreground">Connected to Supabase PostgreSQL cluster</p>
                  </div>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-700">
                  Dual-Layer Sync Active
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-3 rounded-xl bg-background border border-border/80">
                  <span className="text-muted-foreground font-sans block mb-1 font-semibold">Project URL</span>
                  <span className="text-foreground break-all">https://coblvntmcbnyardnsrcs.supabase.co</span>
                </div>
                <div className="p-3 rounded-xl bg-background border border-border/80">
                  <span className="text-muted-foreground font-sans block mb-1 font-semibold">Publishable Key</span>
                  <span className="text-foreground break-all">sb_publishable_d4k0H3i6T0UGSKQsJHZyxQ_THoAl6fN</span>
                </div>
              </div>
            </div>

            {/* Migration SQL Schema */}
            <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold">Complete Schema Migration SQL</h2>
                  <p className="text-xs text-muted-foreground">
                    Copy and run this in your Supabase SQL Editor to provision tables, indexes, and RLS policies.
                  </p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(COMPLETE_DATABASE_SCHEMA_SQL);
                    toast.success("Migration SQL copied to clipboard!");
                  }}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy Schema SQL
                </button>
              </div>

              <pre className="max-h-96 overflow-y-auto rounded-xl bg-secondary/50 p-4 text-[11px] font-mono leading-relaxed text-foreground border border-border/60">
                {COMPLETE_DATABASE_SCHEMA_SQL}
              </pre>
            </div>
          </div>
        )}
      </main>

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <span className="text-xs font-mono uppercase text-muted-foreground">
                  Order #{selectedOrder.id.slice(0, 8)}
                </span>
                <h3 className="text-lg font-bold font-display">
                  {(selectedOrder as any).cake_name || selectedOrder.occasion || "Bespoke Cake"}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background border border-border/80">
                <div>
                  <span className="text-muted-foreground block">Customer</span>
                  <span className="font-bold text-foreground text-sm">{selectedOrder.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Status</span>
                  <span className="font-bold uppercase text-primary text-sm">{selectedOrder.status}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Email</span>
                  <span className="font-medium text-foreground">{selectedOrder.email}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Phone</span>
                  <span className="font-medium text-foreground">{selectedOrder.phone || "Not provided"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-background border border-border/80">
                <div>
                  <span className="text-muted-foreground block">Event Date</span>
                  <span className="font-semibold text-foreground">{selectedOrder.event_date || (selectedOrder as any).date || "TBD"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Portions / Guests</span>
                  <span className="font-semibold text-foreground">{selectedOrder.guests || (selectedOrder as any).portions || "Custom"} people</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Cake Flavour</span>
                  <span className="font-semibold text-foreground">
                    {(selectedOrder.flavours && selectedOrder.flavours.length > 0 ? selectedOrder.flavours.join(", ") : (selectedOrder as any).flavour) || "Vanilla bean"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Budget Guide</span>
                  <span className="font-semibold text-primary">{selectedOrder.budget || "Custom"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Fulfillment</span>
                  <span className="font-semibold capitalize text-foreground">{selectedOrder.fulfilment || (selectedOrder as any).fulfillment || "Collection"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Allergens / Dietary</span>
                  <span className="font-semibold text-foreground">
                    {(selectedOrder.dietary && selectedOrder.dietary.length > 0 ? selectedOrder.dietary.join(", ") : (selectedOrder as any).allergens) || "None"}
                  </span>
                </div>
              </div>

              {(selectedOrder as any).piped_message && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20">
                  <span className="text-muted-foreground block font-semibold mb-1">Piped Cake Message</span>
                  <p className="font-display text-sm italic text-foreground">“{(selectedOrder as any).piped_message}”</p>
                </div>
              )}

              {selectedOrder.notes && (
                <div className="p-3 rounded-xl bg-background border border-border/80">
                  <span className="text-muted-foreground block font-semibold mb-1">Customer Notes</span>
                  <p className="text-muted-foreground">{selectedOrder.notes}</p>
                </div>
              )}

              {/* Live Quote & Payment Management */}
              <div className="p-3.5 rounded-2xl bg-secondary/40 border border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5" />
                    Quote & Payment Status
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      selectedOrder.payment_status === "Paid in Full"
                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                        : selectedOrder.payment_status === "Deposit Paid"
                        ? "bg-blue-500/20 text-blue-700 dark:text-blue-300"
                        : selectedOrder.payment_status === "Pending Verification"
                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {selectedOrder.payment_status || "Unpaid"}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">
                      Agreed Quote ({draftPaymentSettings.currencySymbol})
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 250.00"
                      value={selectedOrder.quote_amount ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value);
                        setSelectedOrder((prev) => (prev ? { ...prev, quote_amount: val } : null));
                      }}
                      className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-foreground focus:border-primary outline-none mt-1"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-semibold text-muted-foreground">
                        Deposit ({draftPaymentSettings.currencySymbol})
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedOrder.quote_amount) {
                            const dep = Math.round(
                              (selectedOrder.quote_amount * (draftPaymentSettings.depositRules.depositPercentage || 50)) / 100
                            );
                            setSelectedOrder((prev) => (prev ? { ...prev, deposit_amount: dep } : null));
                          }
                        }}
                        className="text-[10px] text-primary hover:underline font-bold"
                      >
                        Auto 50%
                      </button>
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 125.00"
                      value={selectedOrder.deposit_amount ?? ""}
                      onChange={(e) => {
                        const val = e.target.value === "" ? null : parseFloat(e.target.value);
                        setSelectedOrder((prev) => (prev ? { ...prev, deposit_amount: val } : null));
                      }}
                      className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-bold text-primary focus:border-primary outline-none mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="text-[11px] font-semibold text-muted-foreground">Payment Status</label>
                    <select
                      value={selectedOrder.payment_status || "Unpaid"}
                      onChange={(e) => {
                        const st = e.target.value as any;
                        setSelectedOrder((prev) => (prev ? { ...prev, payment_status: st } : null));
                      }}
                      className="w-full rounded-xl border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus:border-primary outline-none mt-1"
                    >
                      <option value="Unpaid">Unpaid</option>
                      <option value="Deposit Paid">Deposit Paid</option>
                      <option value="Paid in Full">Paid in Full</option>
                      <option value="Pending Verification">Pending Verification</option>
                      <option value="Refunded">Refunded</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!selectedOrder) return;
                        await updateOrderPayment(selectedOrder.id, {
                          quote_amount: selectedOrder.quote_amount,
                          deposit_amount: selectedOrder.deposit_amount,
                          payment_status: selectedOrder.payment_status || "Unpaid",
                          status:
                            selectedOrder.payment_status === "Deposit Paid" ||
                            selectedOrder.payment_status === "Paid in Full"
                              ? "Confirmed"
                              : selectedOrder.status,
                        });
                        setOrders((prev) =>
                          prev.map((o) => (o.id === selectedOrder.id ? { ...o, ...selectedOrder } : o))
                        );
                        toast.success("Quote & payment details saved to database!");
                      }}
                      className="w-full btn btn-primary !py-1.5 text-xs font-semibold shadow-soft"
                    >
                      Save Pricing
                    </button>
                  </div>
                </div>

                {/* 1-Click Copy Payment Request */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    Pay URL: <code className="text-primary font-mono">{`/pay?order=${selectedOrder.id.slice(0, 8)}`}</code>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const payUrl = `${window.location.origin}/pay?order=${selectedOrder.id}`;
                      const msg =
                        `Hi ${selectedOrder.name},\n\nThank you for choosing Redycakes! Here is your bespoke cake quote for your celebration on ${selectedOrder.event_date}:\n\n` +
                        `🎂 Cake: ${(selectedOrder as any).cake_name || selectedOrder.occasion}\n` +
                        `💰 Total Quote: ${formatMoney(selectedOrder.quote_amount || selectedOrder.budget, draftPaymentSettings.currency)}\n` +
                        `🔒 Deposit to Secure Date: ${formatMoney(selectedOrder.deposit_amount || (selectedOrder.quote_amount ? selectedOrder.quote_amount * 0.5 : 50), draftPaymentSettings.currency)}\n\n` +
                        `Pay online securely with Card or UK Faster Payments here:\n${payUrl}\n\n` +
                        `Or Direct Bank Transfer:\nBank: ${draftPaymentSettings.bankTransfer.bankName}\nSort Code: ${draftPaymentSettings.bankTransfer.sortCode}\nAccount: ${draftPaymentSettings.bankTransfer.accountNumber}\nReference: ${draftPaymentSettings.bankTransfer.referencePrefix}${selectedOrder.id.slice(0, 8).toUpperCase()}`;
                      navigator.clipboard.writeText(msg);
                      toast.success("Complete quote & payment request copied to clipboard!");
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-primary/30 bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition"
                  >
                    <Copy className="h-3 w-3" />
                    <span>Copy Quote & Pay Link</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Actions in Modal */}
            <div className="pt-3 border-t border-border/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {selectedOrder.phone && (
                  <a
                    href={`https://wa.me/${selectedOrder.phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                      `Hi ${selectedOrder.name}, Redycakes cake studio following up on your quote for the ${(selectedOrder as any).cake_name || selectedOrder.occasion} cake!`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-semibold text-xs hover:bg-emerald-500/20"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
                <a
                  href={`mailto:${selectedOrder.email}?subject=${encodeURIComponent(
                    `Redycakes Quote — ${(selectedOrder as any).cake_name || selectedOrder.occasion}`
                  )}&body=${encodeURIComponent(
                    `Hi ${selectedOrder.name},\n\nThank you for choosing Redycakes! Here is the quote for your cake celebration on ${selectedOrder.event_date}:\n\n`
                  )}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-secondary font-semibold text-xs hover:bg-accent"
                >
                  <Mail className="h-3.5 w-3.5" />
                  Email Quote
                </a>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="btn btn-primary !py-1.5 !px-4 text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAKE GALLERY EDIT MODAL */}
      {cakeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <h3 className="text-lg font-bold font-display">
              {editingCakeIndex !== null ? "Edit Cake Product" : "Add Cake Product"}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Cake Title</label>
                <input
                  type="text"
                  required
                  value={cakeForm.title}
                  onChange={(e) => setCakeForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Pistachio Raspberry"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Occasion</label>
                  <select
                    value={cakeForm.occasion}
                    onChange={(e) => setCakeForm((f) => ({ ...f, occasion: e.target.value as any }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="Wedding">Wedding</option>
                    <option value="Birthday">Birthday</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Celebration">Celebration</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Style</label>
                  <select
                    value={cakeForm.style}
                    onChange={(e) => setCakeForm((f) => ({ ...f, style: e.target.value as any }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    <option value="Buttercream">Buttercream</option>
                    <option value="Sculpted">Sculpted</option>
                    <option value="Fondant">Fondant</option>
                    <option value="Dietary-Friendly">Dietary-Friendly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Image URL</label>
                <input
                  type="text"
                  value={cakeForm.src}
                  onChange={(e) => setCakeForm((f) => ({ ...f, src: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. /cakes/cake-sample-1.jpg"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Customer Brief</label>
                <input
                  type="text"
                  value={cakeForm.brief}
                  onChange={(e) => setCakeForm((f) => ({ ...f, brief: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Elegant garden party, 40 guests"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Design Solution / Finish</label>
                <textarea
                  rows={2}
                  value={cakeForm.solution}
                  onChange={(e) => setCakeForm((f) => ({ ...f, solution: e.target.value }))}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Semi-naked tiers pressed with edible violas and gold leaf."
                />
              </div>
            </div>

            <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCakeModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!cakeForm.title) {
                    toast.error("Please enter a cake title.");
                    return;
                  }
                  if (editingCakeIndex !== null) {
                    updateDraft((prev) => {
                      const list = [...prev.gallery];
                      list[editingCakeIndex] = cakeForm;
                      return { ...prev, gallery: list };
                    });
                  } else {
                    updateDraft((prev) => ({
                      ...prev,
                      gallery: [...prev.gallery, cakeForm],
                    }));
                  }
                  setCakeModalOpen(false);
                  toast.success("Cake product updated in draft.");
                }}
                className="btn btn-primary !py-2 !px-4 text-xs font-semibold"
              >
                Save to Gallery
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <h3 className="text-lg font-bold font-display">Add Privileged User</h3>
            <p className="text-xs text-muted-foreground">
              Create a new CMS staff account with specific permissions.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await createUser({
                  name: newUserName,
                  email: newUserEmail,
                  role: newUserRole,
                  password: newUserPassword || undefined,
                });

                if (res.error) {
                  toast.error(res.error);
                } else {
                  toast.success(`User ${newUserName} added successfully!`);
                  setShowAddUserModal(false);
                  setNewUserName("");
                  setNewUserEmail("");
                  setNewUserPassword("");
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. Sarah Jenkins"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="e.g. sarah@redycakes.co.uk"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Initial Password</label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Privilege Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm capitalize"
                >
                  <option value="viewer">Viewer (View stats & content)</option>
                  <option value="editor">Editor (Edit site content & orders)</option>
                  <option value="admin">Admin (Manage users & content)</option>
                  {isSuperAdmin && <option value="superadmin">Superadmin (Full system ownership)</option>}
                </select>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary !py-2 !px-4 text-xs font-semibold">
                  Add User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER ROLE & STATUS MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <h3 className="text-lg font-bold font-display">Edit Privileges — {editingUser.name}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Privilege Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser((prev) => (prev ? { ...prev, role: e.target.value as UserRole } : null))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm capitalize"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                  {isSuperAdmin && <option value="superadmin">Superadmin</option>}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">Account Status</label>
                <select
                  value={editingUser.status}
                  onChange={(e) =>
                    setEditingUser((prev) => (prev ? { ...prev, status: e.target.value as UserStatus } : null))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm capitalize"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!editingUser) return;
                  const res = await updateUser(editingUser.id, {
                    role: editingUser.role,
                    status: editingUser.status,
                  });
                  if (res.error) {
                    toast.error(res.error);
                  } else {
                    toast.success("User updated successfully!");
                    setEditingUser(null);
                  }
                }}
                className="btn btn-primary !py-2 !px-4 text-xs font-semibold"
              >
                Save Privileges
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEST CHECKOUT PREVIEW MODAL */}
      {showTestCheckoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  Interactive Preview
                </span>
                <h3 className="text-lg font-bold font-display mt-1">
                  Customer Checkout Simulation ({draftPaymentSettings.onlinePayments.environment.toUpperCase()})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTestCheckoutModal(false)}
                className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-muted-foreground">
              This preview shows how customers interact with your configured gateway and bank details on <code className="text-primary font-mono">/pay</code>.
            </p>

            {/* Simulated Checkout Box */}
            <div className="rounded-2xl border border-border/70 bg-secondary/20 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Order: Wedding Tasting Box</p>
                  <p className="text-xl font-extrabold font-display text-primary">
                    {formatMoney(draftPaymentSettings.depositRules.tastingBoxPrice, draftPaymentSettings.currency)}
                  </p>
                </div>
                <span className="text-[11px] font-mono bg-background border border-border px-2 py-1 rounded-lg">
                  Ref: {draftPaymentSettings.bankTransfer.referencePrefix}PREVIEW1
                </span>
              </div>

              {draftPaymentSettings.onlinePayments.enabled && (
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
                  <div className="flex items-center justify-between font-semibold">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="h-3.5 w-3.5 text-primary" />
                      <span>Instant Card Payment ({draftPaymentSettings.onlinePayments.provider.toUpperCase()})</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">Encrypted</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-background border border-border/60 font-mono text-[11px] text-muted-foreground">
                    Public Key: {draftPaymentSettings.onlinePayments.stripePublicKey.slice(0, 16)}••••••••
                  </div>
                </div>
              )}

              {draftPaymentSettings.bankTransfer.enabled && (
                <div className="p-3.5 rounded-xl border border-border/80 bg-card space-y-2 text-xs">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>UK Faster Payments Bank Transfer</span>
                  </span>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="p-2 rounded bg-background border border-border/60">
                      <span className="text-muted-foreground block text-[10px]">Sort Code</span>
                      <span className="font-mono font-bold text-foreground">{draftPaymentSettings.bankTransfer.sortCode}</span>
                    </div>
                    <div className="p-2 rounded bg-background border border-border/60">
                      <span className="text-muted-foreground block text-[10px]">Account No</span>
                      <span className="font-mono font-bold text-foreground">{draftPaymentSettings.bankTransfer.accountNumber}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-border/80 flex items-center justify-between">
              <a
                href="/pay"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1"
              >
                <span>Open Live /pay page</span>
                <ExternalLink className="h-3 w-3" />
              </a>

              <button
                type="button"
                onClick={() => setShowTestCheckoutModal(false)}
                className="btn btn-primary !py-1.5 !px-4 text-xs font-semibold"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
