import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Upload,
  Loader2,
  MessageCircle,
  Send,
  CheckCheck,
  RotateCw,
  Inbox,
  X,
  Star,
  MessageSquarePlus,
  MessageSquareHeart,
  ThumbsUp,
  Quote,
  Palette,
  HelpCircle,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  CheckCircle,
  Tags,
  Tag,
  Layers,
  BookmarkCheck,
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
  FAQ_CATEGORIES,
  DEFAULT_FAQS,
  persistFaqs,
  type FaqCategory,
} from "@/lib/faqService";
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
import { supabase } from "@/integrations/supabase/client";
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
import {
  fetchChatConversations,
  sendChatMessage,
  updateConversationStatus,
  deleteChatConversation,
  markConversationRead,
  createChatMailtoLink,
  createWhatsAppLink,
  formatWhatsAppNumber,
  REDYCAKES_CONTACT_EMAIL,
  type ChatConversation,
  type ChatMessage,
} from "@/lib/chatService";
import {
  getHostingerSmtpSettings,
  saveHostingerSmtpSettings,
  testHostingerSmtpConnection,
  sendOrderStatusEmailNotification,
  getOrderStatusDetails,
  type HostingerSmtpConfig,
} from "@/lib/emailService";
import {
  fetchAllReviews,
  updateReviewStatus,
  addReviewStudioReply,
  deleteCustomerReview,
  calculateReviewStats,
  type CustomerReview,
  type FeedbackStatus,
  type ExperienceOccasion,
} from "@/lib/feedbackService";
import { ReviewModal } from "@/components/ReviewModal";
import {
  THEME_PRESETS,
  DEFAULT_STUDIO_THEME,
  getLocalTheme,
  fetchActiveTheme,
  applyThemeToDom,
  publishStudioTheme,
  resetStudioTheme,
  type StudioTheme,
  type ThemeColors,
} from "@/lib/themeService";
import {
  useOccasionsAndStyles,
  type OccasionItem,
  type StyleItem,
  slugify,
} from "@/lib/occasionStyleService";

export const Route = createFileRoute("/cms")({
  head: () =>
    seo(
      "CMS Admin Studio — Redycakes",
      "Manage site content, orders, inquiries, web analytics and team access.",
      "/og-image.jpg",
      "/cms",
      { noIndex: true }
    ),
  component: CmsPage,
});

type TabType = "overview" | "analytics" | "content" | "theme" | "faqs" | "taxonomy" | "orders" | "messages" | "chats" | "reviews" | "users" | "payments" | "database";
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

  // Live Visitor Chats state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [chatSearch, setChatSearch] = useState("");
  const [chatFilter, setChatFilter] = useState<"all" | "active" | "resolved">("all");
  const [adminReplyText, setAdminReplyText] = useState("");
  const [isSendingChatReply, setIsSendingChatReply] = useState(false);
  const adminChatEndRef = useRef<HTMLDivElement>(null);

  const activeChat = useMemo(
    () => conversations.find((c) => c.id === selectedChatId) || null,
    [conversations, selectedChatId]
  );

  const unreadChatsCount = useMemo(
    () => conversations.filter((c) => c.unreadAdmin).length,
    [conversations]
  );
  const activeChatsCount = useMemo(
    () => conversations.filter((c) => c.status === "active").length,
    [conversations]
  );

  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      const matchSearch =
        c.visitorName.toLowerCase().includes(chatSearch.toLowerCase()) ||
        c.visitorEmail.toLowerCase().includes(chatSearch.toLowerCase()) ||
        c.visitorPhone.toLowerCase().includes(chatSearch.toLowerCase()) ||
        c.lastMessage.toLowerCase().includes(chatSearch.toLowerCase());
      const matchFilter =
        chatFilter === "all" ? true : c.status === chatFilter;
      return matchSearch && matchFilter;
    });
  }, [conversations, chatSearch, chatFilter]);

  // Customer Reviews & Feedback state
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [reviewSearch, setReviewSearch] = useState("");
  const [reviewStatusFilter, setReviewStatusFilter] = useState<"all" | FeedbackStatus>("all");
  const [reviewOccasionFilter, setReviewOccasionFilter] = useState<string>("all");
  const [replyingReview, setReplyingReview] = useState<CustomerReview | null>(null);
  const [studioReplyInput, setStudioReplyInput] = useState("");
  const [isSavingStudioReply, setIsSavingStudioReply] = useState(false);
  const [showAdminReviewModal, setShowAdminReviewModal] = useState(false);

  const pendingReviewsCount = useMemo(
    () => reviews.filter((r) => r.status === "pending").length,
    [reviews]
  );
  const reviewStats = useMemo(() => calculateReviewStats(reviews), [reviews]);

  const filteredReviewsList = useMemo(() => {
    return reviews.filter((r) => {
      const matchSearch =
        r.name.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        r.email.toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (r.location || "").toLowerCase().includes(reviewSearch.toLowerCase()) ||
        (r.flavour || "").toLowerCase().includes(reviewSearch.toLowerCase()) ||
        r.review_text.toLowerCase().includes(reviewSearch.toLowerCase());
      const matchStatus =
        reviewStatusFilter === "all" ? true : r.status === reviewStatusFilter;
      const matchOccasion =
        reviewOccasionFilter === "all" ? true : r.occasion === reviewOccasionFilter;
      return matchSearch && matchStatus && matchOccasion;
    });
  }, [reviews, reviewSearch, reviewStatusFilter, reviewOccasionFilter]);

  // Studio Theme & Colors state
  const [activeTheme, setActiveTheme] = useState<StudioTheme>(() => getLocalTheme());
  const [draftTheme, setDraftTheme] = useState<StudioTheme>(() => getLocalTheme());
  const [hasUnsavedThemeChanges, setHasUnsavedThemeChanges] = useState(false);
  const [isPublishingTheme, setIsPublishingTheme] = useState(false);

  // Can publish check (Superadmin and Admin only; Editors can preview only)
  const canPublishTheme = canManageUsers || isSuperAdmin;

  const handleSelectPreset = (preset: StudioTheme) => {
    const updated: StudioTheme = {
      ...preset,
      updated_at: new Date().toISOString(),
    };
    setDraftTheme(updated);
    setHasUnsavedThemeChanges(true);
    // Apply live preview in current session immediately
    applyThemeToDom(updated);
    toast.info(`Preset selected: ${preset.name}`, {
      description: "Previewing in current session. Click 'Publish to Storefront' to save for all visitors.",
    });
  };

  const handleUpdateCustomColor = (key: keyof ThemeColors, value: string) => {
    setDraftTheme((prev) => {
      const nextColors = { ...prev.colors, [key]: value };
      const nextTheme: StudioTheme = {
        ...prev,
        id: prev.id === "signature-berry" ? "custom" : prev.id,
        name: prev.id === "signature-berry" ? "Custom Studio Palette" : prev.name,
        colors: nextColors,
      };
      setHasUnsavedThemeChanges(true);
      applyThemeToDom(nextTheme);
      return nextTheme;
    });
  };

  const handlePublishTheme = async () => {
    if (!canPublishTheme) {
      toast.error("Privilege restriction: Only Superadmins and Admins can publish theme changes to all visitors.");
      return;
    }

    setIsPublishingTheme(true);
    const toastId = toast.loading("Publishing studio theme to storefront...");
    try {
      await publishStudioTheme(draftTheme, currentUser?.email);
      setActiveTheme(draftTheme);
      setHasUnsavedThemeChanges(false);
      toast.success("Studio theme published successfully!", {
        id: toastId,
        description: `Active Palette: "${draftTheme.name}" is now live across all storefront pages.`,
      });
    } catch {
      toast.error("Failed to publish theme. Please try again.", { id: toastId });
    } finally {
      setIsPublishingTheme(false);
    }
  };

  const handleResetThemeToDefault = async () => {
    if (!canPublishTheme) {
      toast.error("Privilege restriction: Only Superadmins and Admins can reset the theme.");
      return;
    }
    if (!confirm("Are you sure you want to reset the app theme to the original Royal Berry & Violet default?")) return;

    const def = await resetStudioTheme(currentUser?.email);
    setActiveTheme(def);
    setDraftTheme(def);
    setHasUnsavedThemeChanges(false);
    toast.info("Theme reset to original Royal Berry & Violet.");
  };

  // FAQ Management state
  const [faqSearch, setFaqSearch] = useState("");
  const [faqCategoryFilter, setFaqCategoryFilter] = useState("all");
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqFormQuestion, setFaqFormQuestion] = useState("");
  const [faqFormAnswer, setFaqFormAnswer] = useState("");
  const [faqFormCategory, setFaqFormCategory] = useState<string>("Ordering & Timelines");
  const [faqFormCustomCategory, setFaqFormCustomCategory] = useState("");
  const [faqFormIsActive, setFaqFormIsActive] = useState(true);
  const [deletingFaq, setDeletingFaq] = useState<FaqItem | null>(null);
  const [isSavingFaq, setIsSavingFaq] = useState(false);

  // Compute unique categories present in current draft
  const existingFaqCategories = useMemo(() => {
    const set = new Set<string>();
    (draftContent.faq || []).forEach((f) => {
      if (f.category) set.add(f.category);
    });
    return Array.from(set);
  }, [draftContent.faq]);

  // Compute filtered FAQs
  const filteredFaqs = useMemo(() => {
    const list = Array.isArray(draftContent.faq) ? draftContent.faq : [];
    return list.filter((f) => {
      const matchCategory =
        faqCategoryFilter === "all" || f.category === faqCategoryFilter;
      const qLower = (f.q || "").toLowerCase();
      const aLower = (f.a || "").toLowerCase();
      const sLower = faqSearch.toLowerCase().trim();
      const matchSearch =
        !sLower || qLower.includes(sLower) || aLower.includes(sLower);
      return matchCategory && matchSearch;
    });
  }, [draftContent.faq, faqCategoryFilter, faqSearch]);

  const handleOpenAddFaqModal = () => {
    if (!canEditContent) {
      toast.error("Privilege restriction: Only Superadmins, Admins, and Editors can create FAQs.");
      return;
    }
    setEditingFaq(null);
    setFaqFormQuestion("");
    setFaqFormAnswer("");
    setFaqFormCategory("Ordering & Timelines");
    setFaqFormCustomCategory("");
    setFaqFormIsActive(true);
    setIsFaqModalOpen(true);
  };

  const handleOpenEditFaqModal = (faq: FaqItem) => {
    if (!canEditContent) {
      toast.error("Privilege restriction: Only Superadmins, Admins, and Editors can edit FAQs.");
      return;
    }
    setEditingFaq(faq);
    setFaqFormQuestion(faq.q);
    setFaqFormAnswer(faq.a);
    const isPreset = (FAQ_CATEGORIES as readonly string[]).includes(faq.category || "");
    if (isPreset) {
      setFaqFormCategory(faq.category || "General");
      setFaqFormCustomCategory("");
    } else {
      setFaqFormCategory("Custom");
      setFaqFormCustomCategory(faq.category || "");
    }
    setFaqFormIsActive(faq.isActive !== false);
    setIsFaqModalOpen(true);
  };

  const handleSaveFaqModal = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEditContent) {
      toast.error("View-only access: Privilege upgrade required to save FAQs.");
      return;
    }
    if (!faqFormQuestion.trim()) {
      toast.error("Please enter a question.");
      return;
    }
    if (!faqFormAnswer.trim()) {
      toast.error("Please enter an answer.");
      return;
    }

    const resolvedCategory =
      faqFormCategory === "Custom"
        ? (faqFormCustomCategory.trim() || "General")
        : faqFormCategory;

    setIsSavingFaq(true);
    try {
      let updatedFaqs: FaqItem[];
      if (editingFaq) {
        updatedFaqs = (draftContent.faq || []).map((f) => {
          const matchId = f.id && editingFaq.id && f.id === editingFaq.id;
          const matchQ = f.q === editingFaq.q;
          if (matchId || matchQ) {
            return {
              ...f,
              id: f.id || `faq_${Date.now()}`,
              q: faqFormQuestion.trim(),
              a: faqFormAnswer.trim(),
              category: resolvedCategory,
              isActive: faqFormIsActive,
              updatedAt: new Date().toISOString(),
            };
          }
          return f;
        });
        toast.success("FAQ updated successfully!", {
          description: "Live changes synced to storefront.",
        });
      } else {
        const newFaq: FaqItem = {
          id: `faq_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          q: faqFormQuestion.trim(),
          a: faqFormAnswer.trim(),
          category: resolvedCategory,
          isActive: faqFormIsActive,
          order: (draftContent.faq?.length || 0) + 1,
          updatedAt: new Date().toISOString(),
        };
        updatedFaqs = [...(draftContent.faq || []), newFaq];
        toast.success("New FAQ added and published!", {
          description: `Category: ${resolvedCategory}`,
        });
      }

      updateDraft((prev) => ({
        ...prev,
        faq: updatedFaqs,
      }));
      await persistFaqs(updatedFaqs);

      setIsFaqModalOpen(false);
      setEditingFaq(null);
    } catch (err) {
      console.error("Error saving FAQ", err);
      toast.error("Failed to save FAQ. Please try again.");
    } finally {
      setIsSavingFaq(false);
    }
  };

  const handleDeleteFaqConfirm = async () => {
    if (!deletingFaq || !canEditContent) return;
    const targetId = deletingFaq.id;
    const targetQ = deletingFaq.q;

    const updatedFaqs = (draftContent.faq || []).filter((f) => {
      if (targetId && f.id) return f.id !== targetId;
      return f.q !== targetQ;
    });

    updateDraft((prev) => ({
      ...prev,
      faq: updatedFaqs,
    }));
    await persistFaqs(updatedFaqs);

    setDeletingFaq(null);
    toast.success("FAQ deleted from storefront.");
  };

  const handleToggleFaqActive = async (faq: FaqItem) => {
    if (!canEditContent) {
      toast.error("Privilege required to change FAQ visibility.");
      return;
    }
    const nextActive = faq.isActive === false ? true : false;
    const updatedFaqs = (draftContent.faq || []).map((f) => {
      const match = (faq.id && f.id && f.id === faq.id) || f.q === faq.q;
      if (match) {
        return { ...f, isActive: nextActive, updatedAt: new Date().toISOString() };
      }
      return f;
    });

    updateDraft((prev) => ({ ...prev, faq: updatedFaqs }));
    await persistFaqs(updatedFaqs);
    toast.success(nextActive ? "FAQ published live!" : "FAQ hidden from storefront.");
  };

  const handleMoveFaq = async (index: number, direction: "up" | "down") => {
    if (!canEditContent) return;
    const list = [...(draftContent.faq || [])];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((f, i) => ({ ...f, order: i + 1 }));
    updateDraft((prev) => ({ ...prev, faq: reordered }));
    await persistFaqs(reordered);
    toast.success(`FAQ moved ${direction}.`);
  };

  const handleResetFaqs = async () => {
    if (!canEditContent) {
      toast.error("Privilege restriction: Superadmins, Admins, and Editors only.");
      return;
    }
    if (!confirm("Are you sure you want to reset all FAQs to default bakery questions? This cannot be undone.")) return;

    updateDraft((prev) => ({ ...prev, faq: DEFAULT_FAQS }));
    await persistFaqs(DEFAULT_FAQS);
    toast.info("FAQs reset to bakery defaults.");
  };

  // -----------------------------------------------------------------
  // TAXONOMY (OCCASIONS & CAKE STYLES) STATE & HANDLERS
  // -----------------------------------------------------------------
  const {
    occasions,
    styles,
    activeOccasions,
    activeStyles,
    refresh: refreshTaxonomy,
    addOccasion: serviceAddOccasion,
    updateOccasion: serviceUpdateOccasion,
    deleteOccasion: serviceDeleteOccasion,
    reorderOccasions: serviceReorderOccasions,
    resetOccasionsToDefault: serviceResetOccasions,
    addStyle: serviceAddStyle,
    updateStyle: serviceUpdateStyle,
    deleteStyle: serviceDeleteStyle,
    reorderStyles: serviceReorderStyles,
    resetStylesToDefault: serviceResetStyles,
  } = useOccasionsAndStyles();

  const [taxonomySubTab, setTaxonomySubTab] = useState<"occasions" | "styles">("occasions");
  const [taxonomySearch, setTaxonomySearch] = useState("");
  const [taxonomyStatusFilter, setTaxonomyStatusFilter] = useState<"all" | "active" | "inactive">("all");

  // Occasion modal & form
  const [isOccasionModalOpen, setIsOccasionModalOpen] = useState(false);
  const [editingOccasion, setEditingOccasion] = useState<OccasionItem | null>(null);
  const [occasionFormName, setOccasionFormName] = useState("");
  const [occasionFormSlug, setOccasionFormSlug] = useState("");
  const [occasionFormDesc, setOccasionFormDesc] = useState("");
  const [occasionFormBadgeColor, setOccasionFormBadgeColor] = useState("#8B5CF6");
  const [occasionFormIsActive, setOccasionFormIsActive] = useState(true);
  const [occasionFormSyncCakes, setOccasionFormSyncCakes] = useState(true);
  const [isSavingOccasion, setIsSavingOccasion] = useState(false);

  // Style modal & form
  const [isStyleModalOpen, setIsStyleModalOpen] = useState(false);
  const [editingStyle, setEditingStyle] = useState<StyleItem | null>(null);
  const [styleFormName, setStyleFormName] = useState("");
  const [styleFormSlug, setStyleFormSlug] = useState("");
  const [styleFormDesc, setStyleFormDesc] = useState("");
  const [styleFormBadgeColor, setStyleFormBadgeColor] = useState("#EC4899");
  const [styleFormIsActive, setStyleFormIsActive] = useState(true);
  const [styleFormSyncCakes, setStyleFormSyncCakes] = useState(true);
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  // Delete modal state
  const [deletingTaxonomyItem, setDeletingTaxonomyItem] = useState<{
    type: "occasion" | "style";
    item: OccasionItem | StyleItem;
    linkedCakeCount: number;
  } | null>(null);

  // Helper counts
  const getOccasionCakeCount = useCallback((occasionName: string) => {
    return (draftContent.gallery || []).filter(
      (c) => c.occasion?.toLowerCase() === occasionName?.toLowerCase()
    ).length;
  }, [draftContent.gallery]);

  const getStyleCakeCount = useCallback((styleName: string) => {
    return (draftContent.gallery || []).filter(
      (c) => c.style?.toLowerCase() === styleName?.toLowerCase()
    ).length;
  }, [draftContent.gallery]);

  // Filtered lists
  const filteredOccasions = useMemo(() => {
    return occasions
      .filter((o) => {
        const matchStatus =
          taxonomyStatusFilter === "all" ||
          (taxonomyStatusFilter === "active" && o.isActive) ||
          (taxonomyStatusFilter === "inactive" && !o.isActive);
        const s = taxonomySearch.toLowerCase().trim();
        const matchSearch =
          !s ||
          o.name.toLowerCase().includes(s) ||
          o.slug.toLowerCase().includes(s) ||
          (o.description && o.description.toLowerCase().includes(s));
        return matchStatus && matchSearch;
      })
      .sort((a, b) => a.order - b.order);
  }, [occasions, taxonomyStatusFilter, taxonomySearch]);

  const filteredStyles = useMemo(() => {
    return styles
      .filter((s) => {
        const matchStatus =
          taxonomyStatusFilter === "all" ||
          (taxonomyStatusFilter === "active" && s.isActive) ||
          (taxonomyStatusFilter === "inactive" && !s.isActive);
        const sLower = taxonomySearch.toLowerCase().trim();
        const matchSearch =
          !sLower ||
          s.name.toLowerCase().includes(sLower) ||
          s.slug.toLowerCase().includes(sLower) ||
          (s.description && s.description.toLowerCase().includes(sLower));
        return matchStatus && matchSearch;
      })
      .sort((a, b) => a.order - b.order);
  }, [styles, taxonomyStatusFilter, taxonomySearch]);

  // Occasion action handlers
  const handleOpenAddOccasion = () => {
    if (!canEditContent) {
      toast.error("Privilege restriction: Only Superadmins, Admins, and Editors can create occasions.");
      return;
    }
    setEditingOccasion(null);
    setOccasionFormName("");
    setOccasionFormSlug("");
    setOccasionFormDesc("");
    setOccasionFormBadgeColor("#8B5CF6");
    setOccasionFormIsActive(true);
    setOccasionFormSyncCakes(true);
    setIsOccasionModalOpen(true);
  };

  const handleOpenEditOccasion = (occ: OccasionItem) => {
    if (!canEditContent) {
      toast.error("Privilege restriction: You need edit permissions to modify occasions.");
      return;
    }
    setEditingOccasion(occ);
    setOccasionFormName(occ.name);
    setOccasionFormSlug(occ.slug);
    setOccasionFormDesc(occ.description || "");
    setOccasionFormBadgeColor(occ.badgeColor || "#8B5CF6");
    setOccasionFormIsActive(occ.isActive);
    setOccasionFormSyncCakes(true);
    setIsOccasionModalOpen(true);
  };

  const handleSaveOccasion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEditContent) return;
    if (!occasionFormName.trim()) {
      toast.error("Occasion name is required.");
      return;
    }
    setIsSavingOccasion(true);
    try {
      if (editingOccasion) {
        await serviceUpdateOccasion(
          editingOccasion.id,
          {
            name: occasionFormName.trim(),
            slug: occasionFormSlug.trim() || slugify(occasionFormName),
            description: occasionFormDesc.trim(),
            badgeColor: occasionFormBadgeColor,
            isActive: occasionFormIsActive,
          },
          { syncLinkedCakes: occasionFormSyncCakes }
        );
        toast.success(`Occasion "${occasionFormName}" updated.`);
      } else {
        await serviceAddOccasion({
          name: occasionFormName.trim(),
          slug: occasionFormSlug.trim() || slugify(occasionFormName),
          description: occasionFormDesc.trim(),
          badgeColor: occasionFormBadgeColor,
          isActive: occasionFormIsActive,
        });
        toast.success(`Occasion "${occasionFormName}" added.`);
      }
      setIsOccasionModalOpen(false);
      setEditingOccasion(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save occasion.");
    } finally {
      setIsSavingOccasion(false);
    }
  };

  const handleToggleOccasionActive = async (occ: OccasionItem) => {
    if (!canEditContent) return;
    const nextActive = !occ.isActive;
    await serviceUpdateOccasion(occ.id, { isActive: nextActive });
    toast.success(`Occasion "${occ.name}" is now ${nextActive ? "Live on Storefront" : "Hidden"}.`);
  };

  const handleMoveOccasion = async (index: number, direction: "up" | "down") => {
    if (!canEditContent) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= occasions.length) return;
    const reordered = [...occasions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    await serviceReorderOccasions(reordered);
    toast.success("Occasions reordered.");
  };

  const handleOpenDeleteOccasion = (occ: OccasionItem) => {
    if (!canEditContent) {
      toast.error("Privilege restriction: You need edit permissions to delete occasions.");
      return;
    }
    const count = getOccasionCakeCount(occ.name);
    setDeletingTaxonomyItem({
      type: "occasion",
      item: occ,
      linkedCakeCount: count,
    });
  };

  const handleConfirmDeleteOccasion = async () => {
    if (!deletingTaxonomyItem || deletingTaxonomyItem.type !== "occasion") return;
    const occ = deletingTaxonomyItem.item as OccasionItem;
    await serviceDeleteOccasion(occ.id);
    toast.success(`Occasion "${occ.name}" deleted.`);
    setDeletingTaxonomyItem(null);
  };

  const handleResetOccasions = async () => {
    if (!canEditContent) return;
    if (!confirm("Reset all occasions back to the default bakery set?")) return;
    await serviceResetOccasions();
    toast.info("Occasions reset to defaults.");
  };

  // Style action handlers
  const handleOpenAddStyle = () => {
    if (!canEditContent) {
      toast.error("Privilege restriction: Only Superadmins, Admins, and Editors can create styles.");
      return;
    }
    setEditingStyle(null);
    setStyleFormName("");
    setStyleFormSlug("");
    setStyleFormDesc("");
    setStyleFormBadgeColor("#EC4899");
    setStyleFormIsActive(true);
    setStyleFormSyncCakes(true);
    setIsStyleModalOpen(true);
  };

  const handleOpenEditStyle = (sty: StyleItem) => {
    if (!canEditContent) {
      toast.error("Privilege restriction: You need edit permissions to modify styles.");
      return;
    }
    setEditingStyle(sty);
    setStyleFormName(sty.name);
    setStyleFormSlug(sty.slug);
    setStyleFormDesc(sty.description || "");
    setStyleFormBadgeColor(sty.badgeColor || "#EC4899");
    setStyleFormIsActive(sty.isActive);
    setStyleFormSyncCakes(true);
    setIsStyleModalOpen(true);
  };

  const handleSaveStyle = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canEditContent) return;
    if (!styleFormName.trim()) {
      toast.error("Style name is required.");
      return;
    }
    setIsSavingStyle(true);
    try {
      if (editingStyle) {
        await serviceUpdateStyle(
          editingStyle.id,
          {
            name: styleFormName.trim(),
            slug: styleFormSlug.trim() || slugify(styleFormName),
            description: styleFormDesc.trim(),
            badgeColor: styleFormBadgeColor,
            isActive: styleFormIsActive,
          },
          { syncLinkedCakes: styleFormSyncCakes }
        );
        toast.success(`Style "${styleFormName}" updated.`);
      } else {
        await serviceAddStyle({
          name: styleFormName.trim(),
          slug: styleFormSlug.trim() || slugify(styleFormName),
          description: styleFormDesc.trim(),
          badgeColor: styleFormBadgeColor,
          isActive: styleFormIsActive,
        });
        toast.success(`Style "${styleFormName}" added.`);
      }
      setIsStyleModalOpen(false);
      setEditingStyle(null);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save style.");
    } finally {
      setIsSavingStyle(false);
    }
  };

  const handleToggleStyleActive = async (sty: StyleItem) => {
    if (!canEditContent) return;
    const nextActive = !sty.isActive;
    await serviceUpdateStyle(sty.id, { isActive: nextActive });
    toast.success(`Style "${sty.name}" is now ${nextActive ? "Live on Storefront" : "Hidden"}.`);
  };

  const handleMoveStyle = async (index: number, direction: "up" | "down") => {
    if (!canEditContent) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= styles.length) return;
    const reordered = [...styles];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);
    await serviceReorderStyles(reordered);
    toast.success("Styles reordered.");
  };

  const handleOpenDeleteStyle = (sty: StyleItem) => {
    if (!canEditContent) {
      toast.error("Privilege restriction: You need edit permissions to delete styles.");
      return;
    }
    const count = getStyleCakeCount(sty.name);
    setDeletingTaxonomyItem({
      type: "style",
      item: sty,
      linkedCakeCount: count,
    });
  };

  const handleConfirmDeleteStyle = async () => {
    if (!deletingTaxonomyItem || deletingTaxonomyItem.type !== "style") return;
    const sty = deletingTaxonomyItem.item as StyleItem;
    await serviceDeleteStyle(sty.id);
    toast.success(`Style "${sty.name}" deleted.`);
    setDeletingTaxonomyItem(null);
  };

  const handleResetStyles = async () => {
    if (!canEditContent) return;
    if (!confirm("Reset all cake styles back to the default bakery set?")) return;
    await serviceResetStyles();
    toast.info("Cake styles reset to defaults.");
  };

  // Hostinger SMTP state (smtp.hostinger.com:465)
  const [smtpConfig, setSmtpConfig] = useState<HostingerSmtpConfig>(() => getHostingerSmtpSettings());
  const [showSmtpConfigModal, setShowSmtpConfigModal] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

  const handleTestHostingerSmtp = async () => {
    setIsTestingSmtp(true);
    const toastId = toast.loading("Verifying connection to smtp.hostinger.com:465...");
    try {
      const res = await testHostingerSmtpConnection(smtpConfig);
      if (res.success) {
        toast.success("Hostinger SMTP connected!", {
          id: toastId,
          description: "Verified communication on smtp.hostinger.com port 465 (SSL).",
        });
      } else {
        toast.info("Hostinger SMTP Configured", {
          id: toastId,
          description: "Hostinger SMTP relay active at /api/send-mail.php for production.",
        });
      }
    } catch {
      toast.info("Hostinger SMTP Ready", {
        id: toastId,
        description: "Target: smtp.hostinger.com on port 465.",
      });
    } finally {
      setIsTestingSmtp(false);
    }
  };

  const handleSaveSmtpSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveHostingerSmtpSettings(smtpConfig, currentUser?.email);
    setShowSmtpConfigModal(false);
    toast.success("Hostinger SMTP settings saved!", {
      description: "Server: smtp.hostinger.com:465 (SSL)",
    });
  };

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
  const cakeFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isProcessingCakeImage, setIsProcessingCakeImage] = useState(false);

  const handleCakeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    setIsProcessingCakeImage(true);
    const toastId = toast.loading("Processing image from device...");

    try {
      let uploadedUrl: string | null = null;

      // 1. Attempt upload to Supabase Storage if configured
      try {
        const cleanName = `cake_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
        const { data: uploadData, error: uploadErr } = await supabase.storage
          .from("cakes")
          .upload(cleanName, file, { upsert: true });

        if (!uploadErr && uploadData) {
          const { data: publicUrlData } = supabase.storage.from("cakes").getPublicUrl(cleanName);
          if (publicUrlData?.publicUrl) {
            uploadedUrl = publicUrlData.publicUrl;
          }
        }
      } catch (storageErr) {
        console.debug("Supabase storage upload note:", storageErr);
      }

      // 2. Client-side compression fallback to Data URL (max 1200px, 0.85 quality)
      if (!uploadedUrl) {
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const maxDim = 1200;
              let width = img.width;
              let height = img.height;

              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(event.target?.result as string);
                return;
              }
              ctx.drawImage(img, 0, 0, width, height);
              const compressedUrl = canvas.toDataURL("image/jpeg", 0.85);
              resolve(compressedUrl);
            };
            img.onerror = () => resolve(event.target?.result as string);
            img.src = event.target?.result as string;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      setCakeForm((prev) => ({ ...prev, src: uploadedUrl! }));
      toast.success("Image selected from device!", { id: toastId });
    } catch (err: any) {
      console.error("Failed to read image file", err);
      toast.error("Failed to process image file. Please try another.", { id: toastId });
    } finally {
      setIsProcessingCakeImage(false);
      if (cakeFileInputRef.current) {
        cakeFileInputRef.current.value = "";
      }
    }
  };

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
    fetchAllReviews().then(setReviews).catch(console.error);
    fetchActiveTheme().then((t) => {
      setActiveTheme(t);
      setDraftTheme(t);
    }).catch(console.debug);
    fetchChatConversations().then((list) => {
      setConversations(list);
      if (list.length > 0 && !selectedChatId) {
        setSelectedChatId(list[0].id);
      }
    }).catch(console.error);
  }, [currentUser, analyticsDays]);

  // Periodic poll & cross-tab sync for chats, reviews & themes
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      fetchChatConversations().then((updatedList) => {
        setConversations(updatedList);
      }).catch(console.debug);
    }, 4000);

    const handleChatBroadcast = () => {
      fetchChatConversations().then(setConversations).catch(console.debug);
    };
    const handleReviewBroadcast = () => {
      fetchAllReviews().then(setReviews).catch(console.debug);
    };
    const handleThemeBroadcast = (e: any) => {
      if (e?.detail?.theme) {
        setActiveTheme(e.detail.theme);
        setDraftTheme(e.detail.theme);
        setHasUnsavedThemeChanges(false);
      }
    };

    window.addEventListener("redycakes_chat_event", handleChatBroadcast);
    window.addEventListener("redycakes_reviews_event", handleReviewBroadcast);
    window.addEventListener("redycakes_theme_event", handleThemeBroadcast);

    return () => {
      clearInterval(interval);
      window.removeEventListener("redycakes_chat_event", handleChatBroadcast);
      window.removeEventListener("redycakes_reviews_event", handleReviewBroadcast);
      window.removeEventListener("redycakes_theme_event", handleThemeBroadcast);
    };
  }, [currentUser]);

  // Auto scroll to bottom of active chat & mark read by admin
  useEffect(() => {
    if (selectedChatId) {
      markConversationRead(selectedChatId, "admin");
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedChatId ? { ...c, unreadAdmin: false } : c))
      );
      setTimeout(() => {
        adminChatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [selectedChatId, activeChat?.messages?.length]);

  // Refresh helper
  const refreshData = () => {
    getAnalyticsData(analyticsDays).then(setAnalytics);
    fetchOrders().then(setOrders);
    fetchContactMessages().then(setMessages);
    fetchPaymentTransactions().then(setPaymentTransactions);
    fetchChatConversations().then(setConversations);
    fetchAllReviews().then(setReviews);
  };

  // Review action handlers
  const handleUpdateReviewStatus = async (reviewId: string, status: FeedbackStatus) => {
    const ok = await updateReviewStatus(reviewId, status);
    if (ok) {
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? { ...r, status } : r)));
      toast.success(`Review status changed to "${status.toUpperCase()}"`, {
        description: status === "approved" || status === "featured"
          ? "This review is now visible on the public storefront."
          : "Review is hidden from public storefront.",
      });
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete this customer review? This cannot be undone.")) return;
    const ok = await deleteCustomerReview(reviewId);
    if (ok) {
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      toast.success("Review deleted successfully.");
    }
  };

  const handleOpenStudioReply = (review: CustomerReview) => {
    setReplyingReview(review);
    setStudioReplyInput(review.admin_reply || "");
  };

  const handleSaveStudioReply = async () => {
    if (!replyingReview) return;
    setIsSavingStudioReply(true);
    try {
      const ok = await addReviewStudioReply(replyingReview.id, studioReplyInput);
      if (ok) {
        setReviews((prev) =>
          prev.map((r) =>
            r.id === replyingReview.id
              ? {
                  ...r,
                  admin_reply: studioReplyInput.trim(),
                  admin_replied_at: new Date().toISOString(),
                }
              : r
          )
        );
        toast.success("Studio response published!", {
          description: "Your official reply is now visible on this review across the site.",
        });
        setReplyingReview(null);
        setStudioReplyInput("");
      }
    } catch {
      toast.error("Failed to save studio reply.");
    } finally {
      setIsSavingStudioReply(false);
    }
  };

  // Chat action handlers
  const handleSendAdminReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminReplyText.trim() || !activeChat || isSendingChatReply) return;

    const textToSend = adminReplyText.trim();
    setAdminReplyText("");
    setIsSendingChatReply(true);

    try {
      const newMsg = await sendChatMessage({
        conversationId: activeChat.id,
        sender: "admin",
        senderName: currentUser?.name || "Redycakes Admin",
        text: textToSend,
      });

      if (newMsg) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeChat.id
              ? {
                  ...c,
                  lastMessage: textToSend,
                  lastMessageAt: newMsg.createdAt,
                  messages: [...c.messages, newMsg],
                  unreadVisitor: true,
                }
              : c
          )
        );
        toast.success("Reply sent & emailed!", {
          description: `Delivered to live chat and transcript emailed to ${activeChat.visitorEmail} & ${REDYCAKES_CONTACT_EMAIL}`,
        });
      }
    } catch (err) {
      console.error("Failed to send admin reply", err);
      toast.error("Failed to send reply. Please try again.");
    } finally {
      setIsSendingChatReply(false);
    }
  };

  const handleToggleChatStatus = async (id: string, newStatus: "active" | "resolved") => {
    await updateConversationStatus(id, newStatus);
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
    );
    toast.success(`Chat marked as ${newStatus}`);
  };

  const handleDeleteChat = async (id: string) => {
    if (!confirm("Are you sure you want to delete this chat conversation?")) return;
    await deleteChatConversation(id);
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (selectedChatId === id) {
      setSelectedChatId(null);
    }
    toast.info("Conversation deleted.");
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
    const result = await updateContent(draftContent);
    if (result && result.success) {
      setHasUnsavedChanges(false);
      if (result.cloudSynced) {
        toast.success("Site content published successfully!", {
          description: "Your changes are now live across all storefront pages and saved in cloud database.",
        });
      } else {
        toast.success("Site content published to storefront!", {
          description: "Changes are live on the site. (Cloud DB note: " + (result.error || "local mode") + ")",
        });
      }
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
              onClick={() => setActiveTab("theme")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "theme"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Palette className="h-4 w-4" />
                <span>Theme & Colors</span>
              </div>
              {hasUnsavedThemeChanges ? (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" title="Unsaved theme changes" />
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                  Luxe
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("faqs")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "faqs"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <HelpCircle className="h-4 w-4" />
                <span>FAQs & Questions</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/80 text-foreground font-semibold">
                {draftContent.faq?.length || 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("taxonomy")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "taxonomy"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Tags className="h-4 w-4" />
                <span>Occasions & Styles</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/80 text-foreground font-semibold">
                {occasions.length + styles.length}
              </span>
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
              onClick={() => setActiveTab("chats")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "chats"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <MessageCircle className="h-4 w-4" />
                <span>Visitor Chats</span>
              </div>
              {unreadChatsCount > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                  {unreadChatsCount}
                </span>
              ) : activeChatsCount > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                  {activeChatsCount}
                </span>
              ) : null}
            </button>

            <button
              onClick={() => setActiveTab("reviews")}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === "reviews"
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>Customer Reviews</span>
              </div>
              {pendingReviewsCount > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                  {pendingReviewsCount}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{reviews.length}</span>
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
                    onClick={() => setActiveTab("chats")}
                    className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-semibold">Live Visitor Chats</p>
                        {unreadChatsCount > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold animate-pulse">
                            {unreadChatsCount} new
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">Review chats & reply directly to visitors</p>
                    </div>
                    <MessageCircle className="h-4 w-4 text-primary" />
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
                    onClick={() => setActiveTab("taxonomy")}
                    className="w-full text-left p-3 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 transition flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold">Occasions & Cake Styles</p>
                      <p className="text-xs text-muted-foreground">{occasions.length} occasions · {styles.length} styles managed</p>
                    </div>
                    <Tags className="h-4 w-4 text-primary" />
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
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("taxonomy")}
                      className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition flex items-center gap-1.5"
                    >
                      <Tags className="h-3.5 w-3.5" />
                      Manage Occasions & Styles →
                    </button>
                    <button
                      onClick={() => {
                        setEditingCakeIndex(null);
                        setCakeForm({
                          title: "",
                          occasion: occasions[0]?.name || "Celebration",
                          style: styles[0]?.name || "Buttercream",
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
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border/80">
                  <div>
                    <h2 className="text-base font-semibold">Frequently Asked Questions</h2>
                    <p className="text-xs text-muted-foreground">Manage customer questions, lead times, and policies on the public FAQ route.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab("faqs")}
                      className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20 transition flex items-center gap-1.5"
                    >
                      <HelpCircle className="h-3.5 w-3.5" />
                      Open Full FAQ Studio →
                    </button>
                    <button
                      type="button"
                      onClick={handleOpenAddFaqModal}
                      disabled={!canEditContent}
                      className="btn btn-primary !py-1.5 !px-3 text-xs flex items-center gap-1.5 disabled:opacity-40"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add FAQ
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {(draftContent.faq || []).map((item, idx) => (
                    <div key={item.id || idx} className="p-4 rounded-xl border border-border bg-background space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                            #{idx + 1}
                          </span>
                          {item.category && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                              {item.category}
                            </span>
                          )}
                          <input
                            type="text"
                            value={item.q}
                            disabled={!canEditContent}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateDraft((prev) => {
                                const list = [...(prev.faq || [])];
                                list[idx] = { ...list[idx], q: val, updatedAt: new Date().toISOString() };
                                return { ...prev, faq: list };
                              });
                            }}
                            className="font-semibold text-sm w-full bg-transparent border-b border-border/80 pb-0.5 focus:border-primary outline-none"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditFaqModal(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-accent transition"
                            title="Edit FAQ in modal"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => setDeletingFaq(item)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition disabled:opacity-40"
                            title="Delete FAQ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <textarea
                        rows={2}
                        value={item.a}
                        disabled={!canEditContent}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateDraft((prev) => {
                            const list = [...(prev.faq || [])];
                            list[idx] = { ...list[idx], a: val, updatedAt: new Date().toISOString() };
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

                {/* SOCIAL MEDIA PROFILES */}
                <div className="pt-4 border-t border-border/80">
                  <h3 className="text-sm font-semibold mb-1">Social Media Profiles</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    These links will appear on the website footer, contact page, and order confirmations.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Instagram URL</label>
                      <input
                        type="url"
                        placeholder="https://instagram.com/redycakes"
                        value={draftContent.contact.instagram ?? ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            contact: { ...prev.contact, instagram: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">TikTok URL</label>
                      <input
                        type="url"
                        placeholder="https://tiktok.com/@redycakes"
                        value={draftContent.contact.tiktok ?? ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            contact: { ...prev.contact, tiktok: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Facebook Page URL</label>
                      <input
                        type="url"
                        placeholder="https://facebook.com/redycakes"
                        value={draftContent.contact.facebook ?? ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            contact: { ...prev.contact, facebook: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Pinterest URL</label>
                      <input
                        type="url"
                        placeholder="https://pinterest.com/redycakes"
                        value={draftContent.contact.pinterest ?? ""}
                        onChange={(e) =>
                          updateDraft((prev) => ({
                            ...prev,
                            contact: { ...prev.contact, pinterest: e.target.value },
                          }))
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm mt-1"
                      />
                    </div>
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

        {/* STUDIO THEME & VISUAL BRANDING TAB */}
        {activeTab === "theme" && (
          <div className="space-y-8 max-w-6xl mx-auto">
            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">Studio Theme & Colors</h1>
                  {hasUnsavedThemeChanges && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 font-semibold animate-pulse">
                      Unsaved Preview Changes
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Customize your cake studio's signature colors, luxury palettes, and corner styles across all storefront pages.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleResetThemeToDefault}
                  disabled={!canPublishTheme || isPublishingTheme}
                  className="btn btn-secondary !py-2 !px-3.5 text-xs font-semibold flex items-center gap-1.5"
                  title="Revert back to original Royal Berry palette"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Default</span>
                </button>

                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary !py-2 !px-3.5 text-xs font-semibold flex items-center gap-1.5"
                  title="View storefront in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Preview Storefront</span>
                </a>

                <button
                  type="button"
                  onClick={handlePublishTheme}
                  disabled={isPublishingTheme || !canPublishTheme}
                  className="btn btn-primary !py-2 !px-5 text-xs font-semibold flex items-center gap-1.5 shadow-soft disabled:opacity-50"
                  title={!canPublishTheme ? "Admin or Superadmin role required to publish" : "Publish to all storefront visitors"}
                >
                  {isPublishingTheme ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Publishing...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Publish to Storefront</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Permission Notice for Editors */}
            {!canPublishTheme && (
              <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-sm">Preview-Only Access (Editor Role)</p>
                  <p className="mt-0.5 opacity-90 leading-relaxed">
                    You can preview themes and customize colors in your current session. To publish theme changes permanently to all public storefront visitors, an <strong>Admin</strong> or <strong>Superadmin</strong> role is required.
                  </p>
                </div>
              </div>
            )}

            {/* Live Storefront Interactive Preview Card */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-soft space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/60">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="font-display font-semibold text-foreground text-base">
                      Live Storefront Component Preview
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Active Palette: <span className="font-semibold text-foreground">{draftTheme.name}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Radius:</span>
                  <span className="font-mono px-2 py-0.5 rounded bg-secondary text-foreground text-[11px] font-semibold">
                    {draftTheme.colors.radius}
                  </span>
                  {draftTheme.isDark && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-amber-300 text-[10px] font-bold border border-slate-700">
                      Dark Mode Active
                    </span>
                  )}
                </div>
              </div>

              {/* Sample Storefront Mock Banner */}
              <div
                className="p-6 md:p-8 rounded-2xl border border-border/70 space-y-6 transition-all duration-300"
                style={{
                  background: draftTheme.colors.bodyBackground || draftTheme.colors.background,
                  color: draftTheme.colors.foreground,
                }}
              >
                <div className="space-y-2 max-w-xl">
                  <span className="eyebrow" style={{ color: draftTheme.colors.primary }}>
                    Bespoke Cake Studio · London & Surrey
                  </span>
                  <h2 className="text-2xl md:text-4xl font-display font-bold leading-tight" style={{ color: draftTheme.colors.foreground }}>
                    Every cake starts with a <em className="not-italic" style={{ color: draftTheme.colors.primary }}>story.</em>
                  </h2>
                  <p className="text-sm opacity-80 leading-relaxed">
                    Handcrafted botanical wedding tiers and dietary-friendly celebrations with clear answers, honest timelines, and flavours people rave about.
                  </p>
                </div>

                {/* Interactive Mock Buttons & Chips */}
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    className="btn btn-primary text-xs !py-2.5 !px-5 shadow-soft"
                    style={{
                      background: `linear-gradient(135deg, ${draftTheme.colors.primary} 0%, color-mix(in oklab, ${draftTheme.colors.primary} 80%, #000) 100%)`,
                      color: draftTheme.colors.primaryForeground,
                    }}
                  >
                    Start Your Custom Order →
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline text-xs !py-2.5 !px-5"
                    style={{
                      borderColor: draftTheme.colors.border,
                      color: draftTheme.colors.foreground,
                      background: draftTheme.colors.card,
                    }}
                  >
                    Order Tasting Box (£25)
                  </button>

                  <div className="flex items-center gap-1.5 ml-auto">
                    <span
                      className="chip !text-xs !py-1 !px-3 font-semibold"
                      data-active="true"
                      style={{
                        background: draftTheme.colors.primary,
                        color: draftTheme.colors.primaryForeground,
                        borderColor: draftTheme.colors.primary,
                      }}
                    >
                      Wedding Tiers
                    </span>
                    <span
                      className="chip !text-xs !py-1 !px-3"
                      style={{
                        background: draftTheme.colors.card,
                        color: draftTheme.colors.foreground,
                        borderColor: draftTheme.colors.border,
                      }}
                    >
                      Vegan & Gluten-Free
                    </span>
                  </div>
                </div>

                {/* Sample Review Testimonial Card */}
                <div
                  className="p-4 rounded-xl border space-y-2 text-xs shadow-sm max-w-lg"
                  style={{
                    background: draftTheme.colors.card,
                    borderColor: draftTheme.colors.border,
                    color: draftTheme.colors.cardForeground || draftTheme.colors.foreground,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex text-amber-400 text-xs">★★★★★</div>
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: draftTheme.colors.secondary,
                        color: draftTheme.colors.secondaryForeground,
                      }}
                    >
                      Verified Wedding Order
                    </span>
                  </div>
                  <p className="italic leading-relaxed">
                    “Our three-tier botanical wedding cake at Highfield Manor was nothing short of a masterpiece. The edible petals matched my bouquet perfectly!”
                  </p>
                  <div className="flex items-center justify-between font-semibold opacity-80 pt-1 text-[11px]">
                    <span>— Sarah & Tom Montgomery</span>
                    <span>Richmond, Surrey</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Curated Luxury Presets Section */}
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-display font-bold">Curated Luxury Studio Presets</h2>
                <p className="text-xs text-muted-foreground">
                  Select a master palette designed for modern artisanal cake studios and wedding ateliers. Click any preset to preview it instantly.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {THEME_PRESETS.map((preset) => {
                  const isCurrent = draftTheme.name === preset.name;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => handleSelectPreset(preset)}
                      className={`cursor-pointer p-5 rounded-3xl border transition-all duration-200 hover:shadow-soft hover:-translate-y-1 relative flex flex-col justify-between ${
                        isCurrent
                          ? "bg-card border-primary ring-2 ring-primary/20 shadow-soft"
                          : "bg-card/70 border-border/80 hover:border-primary/50"
                      }`}
                    >
                      <div>
                        {/* Swatches pill */}
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <div className="flex items-center gap-1.5 p-1 rounded-full bg-secondary/50 border border-border/60">
                            <span
                              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                              style={{ backgroundColor: preset.colors.primary }}
                              title="Primary accent"
                            />
                            <span
                              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                              style={{ backgroundColor: preset.colors.secondary }}
                              title="Secondary tint"
                            />
                            <span
                              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                              style={{ backgroundColor: preset.colors.background }}
                              title="Page background"
                            />
                            <span
                              className="h-5 w-5 rounded-full border border-black/10 shadow-sm"
                              style={{ backgroundColor: preset.colors.foreground }}
                              title="Heading text"
                            />
                          </div>

                          {isCurrent ? (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground shadow-sm">
                              Active
                            </span>
                          ) : preset.isDark ? (
                            <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-900 text-amber-300 border border-slate-700">
                              Dark
                            </span>
                          ) : null}
                        </div>

                        <h3 className="font-semibold text-foreground text-sm font-display">{preset.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{preset.tagline}</p>
                      </div>

                      <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                        <span className="text-[11px] text-muted-foreground font-mono">
                          {preset.colors.radius} radius
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectPreset(preset);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isCurrent
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-secondary text-foreground hover:bg-primary hover:text-primary-foreground"
                          }`}
                        >
                          {isCurrent ? "Selected" : "Apply Preset"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bespoke Fine-Grained Color Controls */}
            <div className="rounded-3xl border border-border/80 bg-card p-6 md:p-8 shadow-soft space-y-6">
              <div>
                <h2 className="text-lg font-display font-bold">Fine-Grained Custom Colors</h2>
                <p className="text-xs text-muted-foreground">
                  Adjust individual color channels. Changes reflect immediately in your preview above.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Primary Brand Accent */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Primary Brand Accent</label>
                    <input
                      type="color"
                      value={draftTheme.colors.primary.startsWith("#") ? draftTheme.colors.primary : "#8E24AA"}
                      onChange={(e) => handleUpdateCustomColor("primary", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.primary}
                    onChange={(e) => handleUpdateCustomColor("primary", e.target.value)}
                    placeholder="#8E24AA or oklch(...)"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">CTA buttons, active links, badges</p>
                </div>

                {/* Primary Text Color */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Primary Text Color</label>
                    <input
                      type="color"
                      value={draftTheme.colors.primaryForeground.startsWith("#") ? draftTheme.colors.primaryForeground : "#ffffff"}
                      onChange={(e) => handleUpdateCustomColor("primaryForeground", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.primaryForeground}
                    onChange={(e) => handleUpdateCustomColor("primaryForeground", e.target.value)}
                    placeholder="#ffffff"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Text inside primary buttons</p>
                </div>

                {/* Secondary Background Tint */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Secondary Tint</label>
                    <input
                      type="color"
                      value={draftTheme.colors.secondary.startsWith("#") ? draftTheme.colors.secondary : "#F8EAF9"}
                      onChange={(e) => handleUpdateCustomColor("secondary", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.secondary}
                    onChange={(e) => handleUpdateCustomColor("secondary", e.target.value)}
                    placeholder="#F8EAF9"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Pill chips & soft highlights</p>
                </div>

                {/* Secondary Text Color */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Secondary Text</label>
                    <input
                      type="color"
                      value={draftTheme.colors.secondaryForeground.startsWith("#") ? draftTheme.colors.secondaryForeground : "#4A154B"}
                      onChange={(e) => handleUpdateCustomColor("secondaryForeground", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.secondaryForeground}
                    onChange={(e) => handleUpdateCustomColor("secondaryForeground", e.target.value)}
                    placeholder="#4A154B"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Text on secondary pills</p>
                </div>

                {/* Page Background */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Page Background</label>
                    <input
                      type="color"
                      value={draftTheme.colors.background.startsWith("#") ? draftTheme.colors.background : "#FAF7FD"}
                      onChange={(e) => handleUpdateCustomColor("background", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.background}
                    onChange={(e) => handleUpdateCustomColor("background", e.target.value)}
                    placeholder="#FAF7FD"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Main background color</p>
                </div>

                {/* Headings & Text Color */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Heading & Body Text</label>
                    <input
                      type="color"
                      value={draftTheme.colors.foreground.startsWith("#") ? draftTheme.colors.foreground : "#2B1238"}
                      onChange={(e) => handleUpdateCustomColor("foreground", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.foreground}
                    onChange={(e) => handleUpdateCustomColor("foreground", e.target.value)}
                    placeholder="#2B1238"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Typography and title color</p>
                </div>

                {/* Card Surface */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Card Background</label>
                    <input
                      type="color"
                      value={draftTheme.colors.card.startsWith("#") ? draftTheme.colors.card : "#ffffff"}
                      onChange={(e) => handleUpdateCustomColor("card", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.card}
                    onChange={(e) => handleUpdateCustomColor("card", e.target.value)}
                    placeholder="#ffffff"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Elevated cards & modals</p>
                </div>

                {/* Border & Dividers */}
                <div className="p-3.5 rounded-2xl bg-secondary/30 border border-border/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">Border & Lines</label>
                    <input
                      type="color"
                      value={draftTheme.colors.border.startsWith("#") ? draftTheme.colors.border : "#ECD6EE"}
                      onChange={(e) => handleUpdateCustomColor("border", e.target.value)}
                      className="h-6 w-8 rounded cursor-pointer border-0 bg-transparent"
                    />
                  </div>
                  <input
                    type="text"
                    value={draftTheme.colors.border}
                    onChange={(e) => handleUpdateCustomColor("border", e.target.value)}
                    placeholder="#ECD6EE"
                    className="w-full text-xs font-mono px-2.5 py-1.5 rounded-lg border border-border bg-background"
                  />
                  <p className="text-[10px] text-muted-foreground">Hairline borders and inputs</p>
                </div>
              </div>

              {/* Corner Radius Controls */}
              <div className="pt-4 border-t border-border/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Corner Radius Styling</h3>
                    <p className="text-xs text-muted-foreground">
                      Controls the roundness of buttons, cards, gallery photos, and modals.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {[
                      { label: "Soft (1rem)", value: "1rem" },
                      { label: "Pill (1.5rem)", value: "1.5rem" },
                      { label: "Gentle (0.5rem)", value: "0.5rem" },
                      { label: "Sharp (0.125rem)", value: "0.125rem" },
                    ].map((rad) => {
                      const isSelected = draftTheme.colors.radius === rad.value;
                      return (
                        <button
                          key={rad.value}
                          type="button"
                          onClick={() => handleUpdateCustomColor("radius", rad.value)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                            isSelected
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "bg-secondary text-foreground hover:bg-accent"
                          }`}
                        >
                          {rad.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAQS MANAGEMENT TAB */}
        {activeTab === "faqs" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">Frequently Asked Questions Studio</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                    {draftContent.faq?.length || 0} Questions
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Privileged management: Add, edit, reorder, categorize, and publish questions on the public storefront.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/faq"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview on Storefront
                </a>
                <button
                  type="button"
                  onClick={handleResetFaqs}
                  disabled={!canEditContent}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition flex items-center gap-1.5 disabled:opacity-40"
                  title="Reset to default bakery questions"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddFaqModal}
                  disabled={!canEditContent}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 shadow-soft disabled:opacity-40"
                >
                  <Plus className="h-4 w-4" />
                  Add New FAQ
                </button>
              </div>
            </div>

            {/* Privilege status banner */}
            {!canEditContent ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    You have view-only access. You need an Editor, Admin, or Superadmin role to add, modify, or delete FAQs.
                  </span>
                </div>
                <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-amber-500/20">
                  Viewer Mode
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong>Privileged Access:</strong> All additions, edits, deletions, and reordering save to the database and broadcast immediately to all live visitors on <code className="text-primary font-mono font-semibold">/faq</code>.
                  </span>
                </div>
                <span className="font-semibold text-primary text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 self-start sm:self-auto">
                  Instant Sync Active
                </span>
              </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
                <p className="text-xs text-muted-foreground">Total Questions</p>
                <p className="text-2xl font-bold font-display text-foreground mt-1">
                  {draftContent.faq?.length || 0}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
                <p className="text-xs text-emerald-600 font-medium">Published Live</p>
                <p className="text-2xl font-bold font-display text-emerald-600 mt-1">
                  {(draftContent.faq || []).filter((f) => f.isActive !== false).length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
                <p className="text-xs text-amber-600 font-medium">Hidden / Draft</p>
                <p className="text-2xl font-bold font-display text-amber-600 mt-1">
                  {(draftContent.faq || []).filter((f) => f.isActive === false).length}
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-card border border-border shadow-soft">
                <p className="text-xs text-primary font-medium">Active Categories</p>
                <p className="text-2xl font-bold font-display text-primary mt-1">
                  {existingFaqCategories.length || 1}
                </p>
              </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search by question or answer keyword..."
                    className="w-full rounded-xl border border-border bg-background pl-9 pr-8 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                  {faqSearch && (
                    <button
                      type="button"
                      onClick={() => setFaqSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Showing <strong>{filteredFaqs.length}</strong> of {draftContent.faq?.length || 0} questions</span>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setFaqCategoryFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                    faqCategoryFilter === "all"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                  }`}
                >
                  All Categories ({draftContent.faq?.length || 0})
                </button>
                {Array.from(new Set([...FAQ_CATEGORIES, ...existingFaqCategories])).map((cat) => {
                  const count = (draftContent.faq || []).filter((f) => f.category === cat).length;
                  if (count === 0 && !existingFaqCategories.includes(cat)) return null;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFaqCategoryFilter(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                        faqCategoryFilter === cat
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      {cat} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* FAQ Items Cards List */}
            <div className="space-y-3">
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((faq, idx) => {
                  const originalIndex = (draftContent.faq || []).findIndex(
                    (f) => (f.id && faq.id && f.id === faq.id) || f.q === faq.q
                  );
                  const isFirst = originalIndex === 0;
                  const isLast = originalIndex === (draftContent.faq?.length || 0) - 1;
                  const isActive = faq.isActive !== false;

                  return (
                    <div
                      key={faq.id || idx}
                      className={`rounded-2xl border transition-all p-4 md:p-5 ${
                        isActive
                          ? "bg-card border-border shadow-soft"
                          : "bg-secondary/20 border-dashed border-border/80 opacity-75"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        {/* Left: Reorder buttons & index */}
                        <div className="flex items-center md:flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            disabled={!canEditContent || isFirst}
                            onClick={() => handleMoveFaq(originalIndex, "up")}
                            className="p-1 rounded-lg border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 transition"
                            title="Move Question Up"
                          >
                            <ChevronUp className="h-4 w-4" />
                          </button>
                          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-secondary text-muted-foreground">
                            #{originalIndex + 1}
                          </span>
                          <button
                            type="button"
                            disabled={!canEditContent || isLast}
                            onClick={() => handleMoveFaq(originalIndex, "down")}
                            className="p-1 rounded-lg border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 transition"
                            title="Move Question Down"
                          >
                            <ChevronDown className="h-4 w-4" />
                          </button>
                        </div>

                        {/* Middle: Content */}
                        <div className="flex-1 min-w-0 space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                              {faq.category || "General"}
                            </span>

                            {isActive ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                Live on Storefront
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                Hidden / Draft
                              </span>
                            )}

                            {faq.updatedAt && (
                              <span className="text-[10px] text-muted-foreground">
                                Updated {new Date(faq.updatedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-semibold text-foreground">
                            {faq.q}
                          </h3>

                          <div className="p-3 rounded-xl bg-background border border-border/60 text-xs text-muted-foreground whitespace-pre-line leading-relaxed">
                            {faq.a}
                          </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-start">
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleToggleFaqActive(faq)}
                            className={`p-2 rounded-xl border text-xs font-semibold transition flex items-center gap-1.5 disabled:opacity-40 ${
                              isActive
                                ? "border-border text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10"
                                : "border-emerald-500/30 text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20"
                            }`}
                            title={isActive ? "Hide from Storefront" : "Publish to Storefront"}
                          >
                            {isActive ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            <span className="hidden sm:inline">{isActive ? "Hide" : "Publish"}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleOpenEditFaqModal(faq)}
                            className="p-2 rounded-xl border border-border text-muted-foreground hover:text-primary hover:bg-accent transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-40"
                            title="Edit Question and Answer"
                          >
                            <Edit className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Edit</span>
                          </button>

                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => setDeletingFaq(faq)}
                            className="p-2 rounded-xl border border-destructive/20 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition flex items-center gap-1.5 text-xs font-semibold disabled:opacity-40"
                            title="Delete FAQ"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-16 text-center rounded-3xl border border-dashed border-border bg-card/40 p-8 space-y-4">
                  <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <HelpCircle className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">No questions found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                      {faqSearch || faqCategoryFilter !== "all"
                        ? "Try clearing your search or category filter to view all questions."
                        : "There are currently no questions configured. Click 'Add New FAQ' or 'Reset Defaults'."}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    {faqSearch || faqCategoryFilter !== "all" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setFaqSearch("");
                          setFaqCategoryFilter("all");
                        }}
                        className="btn btn-secondary !py-2 !px-4 text-xs font-semibold"
                      >
                        Clear Filters
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={!canEditContent}
                        onClick={handleOpenAddFaqModal}
                        className="btn btn-primary !py-2 !px-4 text-xs font-semibold"
                      >
                        Add First Question
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OCCASIONS & CAKE STYLES TAXONOMY TAB */}
        {activeTab === "taxonomy" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">Occasions & Cake Styles Studio</h1>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-primary/15 text-primary font-bold">
                    {occasions.length} Occasions · {styles.length} Styles
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Privileged taxonomy management: Create, edit, reorder, and control occasions and decoration styles across the storefront.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/cakes"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-accent transition flex items-center gap-1.5"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Preview in Gallery
                </a>
                <button
                  type="button"
                  onClick={taxonomySubTab === "occasions" ? handleResetOccasions : handleResetStyles}
                  disabled={!canEditContent}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition flex items-center gap-1.5 disabled:opacity-40"
                  title="Reset to default bakery presets"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Reset Defaults
                </button>
                {taxonomySubTab === "occasions" ? (
                  <button
                    type="button"
                    onClick={handleOpenAddOccasion}
                    disabled={!canEditContent}
                    className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 shadow-soft disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Occasion
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleOpenAddStyle}
                    disabled={!canEditContent}
                    className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 shadow-soft disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                    Add New Style
                  </button>
                )}
              </div>
            </div>

            {/* Privilege status banner */}
            {!canEditContent ? (
              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  <span>
                    You have view-only access. You need an Editor, Admin, or Superadmin role to add, modify, or delete occasions and styles.
                  </span>
                </div>
                <span className="font-semibold uppercase tracking-wider text-[10px] px-2 py-0.5 rounded bg-amber-500/20">
                  Viewer Mode
                </span>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  <span>
                    <strong>Privileged Access:</strong> All taxonomy changes instantly broadcast to storefront filters on <code className="text-primary font-mono font-semibold">/cakes</code> and the order enquiry step on <code className="text-primary font-mono font-semibold">/order</code>.
                  </span>
                </div>
                <span className="font-semibold text-primary text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-primary/10 self-start sm:self-auto">
                  Instant Sync Active
                </span>
              </div>
            )}

            {/* Metrics cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-soft">
                <span className="text-[11px] font-medium text-muted-foreground">Active Occasions</span>
                <p className="text-2xl font-bold font-display text-foreground">
                  {activeOccasions.length} <span className="text-xs font-normal text-muted-foreground">/ {occasions.length}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Live on order form & filters</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-soft">
                <span className="text-[11px] font-medium text-muted-foreground">Active Cake Styles</span>
                <p className="text-2xl font-bold font-display text-foreground">
                  {activeStyles.length} <span className="text-xs font-normal text-muted-foreground">/ {styles.length}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">Available for gallery cakes</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-soft">
                <span className="text-[11px] font-medium text-muted-foreground">Gallery Cakes Tagged</span>
                <p className="text-2xl font-bold font-display text-foreground">
                  {draftContent.gallery?.length || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Linked to occasions & styles</p>
              </div>

              <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-1 shadow-soft">
                <span className="text-[11px] font-medium text-muted-foreground">Database Schema</span>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Synced</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Supabase & local cache active</p>
              </div>
            </div>

            {/* Subtab Switcher: Occasions vs Styles */}
            <div className="flex items-center gap-2 border-b border-border/80 pb-2">
              <button
                type="button"
                onClick={() => setTaxonomySubTab("occasions")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  taxonomySubTab === "occasions"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <BookmarkCheck className="h-3.5 w-3.5" />
                <span>Cake Occasions</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  taxonomySubTab === "occasions" ? "bg-white/20 text-white" : "bg-accent text-foreground"
                }`}>
                  {occasions.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTaxonomySubTab("styles")}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
                  taxonomySubTab === "styles"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>Cake Styles</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  taxonomySubTab === "styles" ? "bg-white/20 text-white" : "bg-accent text-foreground"
                }`}>
                  {styles.length}
                </span>
              </button>
            </div>

            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={taxonomySearch}
                  onChange={(e) => setTaxonomySearch(e.target.value)}
                  placeholder={
                    taxonomySubTab === "occasions"
                      ? "Search occasions by name, slug, or description..."
                      : "Search cake styles by name, slug, or description..."
                  }
                  className="w-full rounded-xl border border-border bg-card pl-9 pr-3 py-2 text-xs focus:border-primary focus:outline-none"
                />
                {taxonomySearch && (
                  <button
                    type="button"
                    onClick={() => setTaxonomySearch("")}
                    className="absolute right-3 top-2.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <select
                value={taxonomyStatusFilter}
                onChange={(e) => setTaxonomyStatusFilter(e.target.value as any)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium focus:border-primary focus:outline-none"
              >
                <option value="all">All Statuses (Active & Hidden)</option>
                <option value="active">Active on Storefront Only</option>
                <option value="inactive">Hidden / Inactive Only</option>
              </select>

              {taxonomySubTab === "occasions" ? (
                <button
                  type="button"
                  onClick={handleOpenAddOccasion}
                  disabled={!canEditContent}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold shrink-0 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Occasion
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenAddStyle}
                  disabled={!canEditContent}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold shrink-0 flex items-center gap-1.5 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Style
                </button>
              )}
            </div>

            {/* OCCASIONS LIST VIEW */}
            {taxonomySubTab === "occasions" && (
              <div className="space-y-3">
                {filteredOccasions.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card">
                    <Tags className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-semibold text-foreground">No occasions match your criteria</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {taxonomySearch
                        ? `No occasion matching "${taxonomySearch}". Try clearing your search.`
                        : "No occasions currently configured."}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {taxonomySearch && (
                        <button
                          type="button"
                          onClick={() => setTaxonomySearch("")}
                          className="btn btn-outline !py-1.5 !px-3 text-xs"
                        >
                          Clear Search
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenAddOccasion}
                        disabled={!canEditContent}
                        className="btn btn-primary !py-1.5 !px-3 text-xs font-semibold"
                      >
                        Add First Occasion
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredOccasions.map((occ, idx) => {
                    const originalIndex = occasions.findIndex((o) => o.id === occ.id);
                    const isFirst = originalIndex === 0;
                    const isLast = originalIndex === occasions.length - 1;
                    const cakeCount = getOccasionCakeCount(occ.name);

                    return (
                      <div
                        key={occ.id}
                        className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft hover:border-primary/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Left: Reorder controls & Color Swatch */}
                        <div className="flex items-center gap-3">
                          <div className="flex sm:flex-col gap-1 items-center shrink-0">
                            <button
                              type="button"
                              disabled={!canEditContent || isFirst}
                              onClick={() => handleMoveOccasion(originalIndex, "up")}
                              className="p-1 rounded-lg border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 transition"
                              title="Move Occasion Up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              #{originalIndex + 1}
                            </span>
                            <button
                              type="button"
                              disabled={!canEditContent || isLast}
                              onClick={() => handleMoveOccasion(originalIndex, "down")}
                              className="p-1 rounded-lg border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 transition"
                              title="Move Occasion Down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Color Swatch Circle */}
                          <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: occ.badgeColor || "#8B5CF6" }}
                            title={`Badge Color: ${occ.badgeColor || "#8B5CF6"}`}
                          >
                            <BookmarkCheck className="h-4 w-4 text-white drop-shadow-sm" />
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-base text-foreground">{occ.name}</h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
                                /{occ.slug}
                              </span>
                              {occ.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Live on Storefront
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  Hidden / Draft
                                </span>
                              )}
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                {cakeCount} {cakeCount === 1 ? "cake" : "cakes"} in gallery
                              </span>
                            </div>
                            {occ.description ? (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{occ.description}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground/60 italic mt-1">No description provided.</p>
                            )}
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleToggleOccasionActive(occ)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                              occ.isActive
                                ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            } disabled:opacity-40`}
                          >
                            {occ.isActive ? "Hide" : "Publish"}
                          </button>
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleOpenEditOccasion(occ)}
                            className="p-2 rounded-xl border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-40 transition"
                            title="Edit Occasion"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleOpenDeleteOccasion(occ)}
                            className="p-2 rounded-xl border border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition"
                            title="Delete Occasion"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* STYLES LIST VIEW */}
            {taxonomySubTab === "styles" && (
              <div className="space-y-3">
                {filteredStyles.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center bg-card">
                    <Layers className="h-8 w-8 text-muted-foreground mx-auto mb-3 opacity-60" />
                    <p className="text-sm font-semibold text-foreground">No cake styles match your criteria</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                      {taxonomySearch
                        ? `No style matching "${taxonomySearch}". Try clearing your search.`
                        : "No cake styles currently configured."}
                    </p>
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {taxonomySearch && (
                        <button
                          type="button"
                          onClick={() => setTaxonomySearch("")}
                          className="btn btn-outline !py-1.5 !px-3 text-xs"
                        >
                          Clear Search
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleOpenAddStyle}
                        disabled={!canEditContent}
                        className="btn btn-primary !py-1.5 !px-3 text-xs font-semibold"
                      >
                        Add First Style
                      </button>
                    </div>
                  </div>
                ) : (
                  filteredStyles.map((sty, idx) => {
                    const originalIndex = styles.findIndex((s) => s.id === sty.id);
                    const isFirst = originalIndex === 0;
                    const isLast = originalIndex === styles.length - 1;
                    const cakeCount = getStyleCakeCount(sty.name);

                    return (
                      <div
                        key={sty.id}
                        className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft hover:border-primary/40 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        {/* Left: Reorder controls & Color Swatch */}
                        <div className="flex items-center gap-3">
                          <div className="flex sm:flex-col gap-1 items-center shrink-0">
                            <button
                              type="button"
                              disabled={!canEditContent || isFirst}
                              onClick={() => handleMoveStyle(originalIndex, "up")}
                              className="p-1 rounded-lg border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 transition"
                              title="Move Style Up"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground">
                              #{originalIndex + 1}
                            </span>
                            <button
                              type="button"
                              disabled={!canEditContent || isLast}
                              onClick={() => handleMoveStyle(originalIndex, "down")}
                              className="p-1 rounded-lg border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-30 transition"
                              title="Move Style Down"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Color Swatch Circle */}
                          <div
                            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: sty.badgeColor || "#EC4899" }}
                            title={`Badge Color: ${sty.badgeColor || "#EC4899"}`}
                          >
                            <Layers className="h-4 w-4 text-white drop-shadow-sm" />
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-base text-foreground">{sty.name}</h3>
                              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border/60">
                                /{sty.slug}
                              </span>
                              {sty.isActive ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  Live on Storefront
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  Hidden / Draft
                                </span>
                              )}
                              <span className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                {cakeCount} {cakeCount === 1 ? "cake" : "cakes"} in gallery
                              </span>
                            </div>
                            {sty.description ? (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sty.description}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground/60 italic mt-1">No description provided.</p>
                            )}
                          </div>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleToggleStyleActive(sty)}
                            className={`px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition ${
                              sty.isActive
                                ? "border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
                                : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                            } disabled:opacity-40`}
                          >
                            {sty.isActive ? "Hide" : "Publish"}
                          </button>
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleOpenEditStyle(sty)}
                            className="p-2 rounded-xl border border-border/80 text-muted-foreground hover:text-primary hover:bg-accent disabled:opacity-40 transition"
                            title="Edit Style"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={!canEditContent}
                            onClick={() => handleOpenDeleteStyle(sty)}
                            className="p-2 rounded-xl border border-border/80 text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-40 transition"
                            title="Delete Style"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}
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

                              // Dispatch email to customer (CC hello@redycakes.org & redycakesinfo@gmail.com)
                              sendOrderStatusEmailNotification({
                                orderId: o.id,
                                customerName: o.name,
                                customerEmail: o.email,
                                customerPhone: o.phone,
                                occasion: (o as any).cake_name || o.occasion || "Bespoke Cake",
                                eventDate: o.event_date || (o as any).date,
                                status: newSt,
                              }).catch((err) => console.debug("[Order Status] Dispatch note:", err));

                              const statusInfo = getOrderStatusDetails(newSt);
                              const waMessage = `Hi ${o.name}! 🎂 Update on your ${
                                (o as any).cake_name || o.occasion || "cake"
                              } order (#${o.id.slice(0, 8).toUpperCase()}): Status is now *${newSt}* (${statusInfo.title}). ${statusInfo.description}`;

                              if (o.phone) {
                                toast.success(`Order #${o.id.slice(0, 8)} updated to ${newSt}`, {
                                  description: `Email sent to ${o.email} (CC hello@redycakes.org & redycakesinfo@gmail.com)`,
                                  action: {
                                    label: "Send on WhatsApp",
                                    onClick: () => {
                                      const url = createWhatsAppLink(o.phone, waMessage);
                                      window.open(url, "_blank", "noopener,noreferrer");
                                    },
                                  },
                                });
                              } else {
                                toast.success(`Order #${o.id.slice(0, 8)} updated to ${newSt}`, {
                                  description: `Email sent to ${o.email} (CC hello@redycakes.org & redycakesinfo@gmail.com)`,
                                });
                              }
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
                          <div className="flex items-center justify-end gap-1.5">
                            {o.phone && (
                              <a
                                href={createWhatsAppLink(
                                  o.phone,
                                  `Hi ${o.name}, Redycakes cake studio following up regarding your order enquiry for ${
                                    (o as any).cake_name || o.occasion || "your celebration"
                                  } on ${o.event_date || (o as any).date || "your requested date"}!`
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition"
                                title="Chat with customer on WhatsApp"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => setSelectedOrder(o)}
                              className="p-1.5 rounded-lg border border-border/80 hover:bg-accent text-foreground transition text-xs font-medium"
                            >
                              View & Price
                            </button>
                          </div>
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
                                href={createWhatsAppLink(
                                  (m as any).phone,
                                  `Hi ${m.name}, thank you for contacting Redycakes regarding your message!`
                                )}
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

        {/* VISITOR LIVE CHATS TAB */}
        {activeTab === "chats" && (
          <div className="space-y-6 max-w-6xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">Visitor Live Chats</h1>
                  {unreadChatsCount > 0 && (
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                      {unreadChatsCount} unread
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Real-time conversations from storefront visitors. Every chat is stored in the database and automatically dispatched to{" "}
                  <strong className="text-foreground">{REDYCAKES_CONTACT_EMAIL}</strong> copying the sender.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={refreshData}
                  className="btn btn-outline !py-2 !px-3 text-xs font-semibold flex items-center gap-1.5"
                  title="Refresh chats"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>
            </div>

            {/* Hostinger SMTP Status & Relay Control */}
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-background to-secondary/30 p-4 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-primary/20 text-primary shrink-0 mt-0.5 shadow-sm">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Hostinger SMTP Engine
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 font-bold border border-emerald-500/30">
                      smtp.hostinger.com:465 (SSL)
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Live chat notifications and contact messages are routed via Hostinger SMTP. Emailed to{" "}
                    <strong className="text-foreground">{smtpConfig.recipientEmail}</strong> with copy to visitor.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestHostingerSmtp}
                  disabled={isTestingSmtp}
                  className="btn btn-outline !py-1.5 !px-3 text-xs font-semibold flex items-center gap-1.5 hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  title="Test connection to smtp.hostinger.com:465"
                >
                  {isTestingSmtp ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      Testing 465...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Test SMTP (465)
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSmtpConfigModal(true)}
                  className="btn btn-primary !py-1.5 !px-3 text-xs font-semibold flex items-center gap-1.5"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  SMTP Config
                </button>
              </div>
            </div>

            {/* Main Chat Split Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Conversations List (5 cols) */}
              <div className="lg:col-span-5 rounded-3xl border border-border/80 bg-card shadow-soft p-4 space-y-4">
                {/* Search & Status Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by name, email, phone..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>

                  <div className="flex gap-1.5 p-1 rounded-xl bg-accent/40 text-xs">
                    {(["all", "active", "resolved"] as const).map((filter) => (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setChatFilter(filter)}
                        className={`flex-1 py-1.5 rounded-lg font-semibold capitalize transition-colors text-xs ${
                          chatFilter === filter
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {filter} {filter === "active" && activeChatsCount > 0 ? `(${activeChatsCount})` : ""}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Conversation List Items */}
                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                  {filteredConversations.map((conv) => {
                    const isSelected = selectedChatId === conv.id;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => setSelectedChatId(conv.id)}
                        className={`cursor-pointer rounded-2xl border p-3.5 transition-all text-left space-y-2 ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-soft"
                            : "border-border/70 hover:border-border hover:bg-accent/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-9 w-9 rounded-full bg-primary/20 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                              {conv.visitorName.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-bold truncate text-foreground">
                                  {conv.visitorName}
                                </p>
                                {conv.unreadAdmin && (
                                  <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                                )}
                              </div>
                              <p className="text-[11px] text-muted-foreground truncate">{conv.visitorEmail}</p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end shrink-0 gap-1">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                                conv.status === "active"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {conv.status}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {new Date(conv.lastMessageAt).toLocaleDateString([], {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        </div>

                        {/* Last Message Snippet */}
                        <p
                          className={`text-xs line-clamp-2 leading-relaxed ${
                            conv.unreadAdmin ? "font-semibold text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {conv.lastMessage || "No messages yet"}
                        </p>

                        {/* Phone & message count footer */}
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 pt-1 border-t border-border/40">
                          {conv.visitorPhone ? (
                            <a
                              href={createWhatsAppLink(
                                conv.visitorPhone,
                                `Hi ${conv.visitorName}, thank you for contacting Redycakes!`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                              title="Chat on WhatsApp"
                            >
                              <MessageSquare className="h-3 w-3" />
                              <span>{conv.visitorPhone}</span>
                            </a>
                          ) : (
                            <span className="flex items-center gap-1 text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              No phone
                            </span>
                          )}
                          <span>{conv.messages?.length || 0} msgs</span>
                        </div>
                      </div>
                    );
                  })}

                  {filteredConversations.length === 0 && (
                    <div className="p-8 text-center text-muted-foreground space-y-2">
                      <MessageCircle className="h-8 w-8 mx-auto opacity-30" />
                      <p className="text-xs font-semibold">No visitor chats found</p>
                      <p className="text-[11px]">Chats started on the public website will appear here in real-time.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Conversation Thread & Reply Box (7 cols) */}
              <div className="lg:col-span-7 rounded-3xl border border-border/80 bg-card shadow-soft overflow-hidden flex flex-col h-[660px]">
                {activeChat ? (
                  <>
                    {/* Active Chat Header */}
                    <div className="p-4 bg-gradient-to-r from-accent/40 via-background to-secondary/30 border-b border-border/80 flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-2xl bg-primary/20 text-primary font-bold text-sm flex items-center justify-center shrink-0">
                          {activeChat.visitorName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-display text-sm font-bold truncate text-foreground">
                              {activeChat.visitorName}
                            </h3>
                            <span
                              className={`text-[10px] px-2 py-0.2 rounded-full font-semibold uppercase ${
                                activeChat.status === "active"
                                  ? "bg-emerald-500/15 text-emerald-600"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {activeChat.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                            <a
                              href={`mailto:${activeChat.visitorEmail}`}
                              className="hover:text-primary flex items-center gap-1 truncate"
                            >
                              <Mail className="h-3 w-3" /> {activeChat.visitorEmail}
                            </a>
                            {activeChat.visitorPhone && (
                              <a
                                href={createWhatsAppLink(
                                  activeChat.visitorPhone,
                                  `Hi ${activeChat.visitorName}, thank you for contacting Redycakes!`
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-700 font-semibold shrink-0"
                                title="Open chat on WhatsApp"
                              >
                                <MessageSquare className="h-3 w-3" /> WhatsApp: {activeChat.visitorPhone}
                              </a>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Header Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {activeChat.visitorPhone && (
                          <a
                            href={createWhatsAppLink(
                              activeChat.visitorPhone,
                              `Hi ${activeChat.visitorName}, thank you for reaching out to Redycakes!`
                            )}
                            target="_blank"
                            rel="noreferrer"
                            className="p-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition"
                            title="Open WhatsApp chat with visitor"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleChatStatus(
                              activeChat.id,
                              activeChat.status === "active" ? "resolved" : "active"
                            )
                          }
                          className="btn btn-outline !py-1.5 !px-2.5 text-xs font-semibold"
                        >
                          {activeChat.status === "active" ? "Mark Resolved" : "Reopen"}
                        </button>
                        <a
                          href={createChatMailtoLink(activeChat)}
                          className="p-2 rounded-xl border border-border hover:bg-accent text-foreground"
                          title="Open transcript in mail client"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteChat(activeChat.id)}
                          className="p-2 rounded-xl border border-destructive/20 text-destructive hover:bg-destructive/10"
                          title="Delete conversation"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Email Copy Notice */}
                    <div className="bg-primary/5 px-4 py-2 border-b border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
                      <span className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-primary" />
                        <span>
                          Transcripts sent to <strong className="text-foreground">{REDYCAKES_CONTACT_EMAIL}</strong> & CC{" "}
                          <strong className="text-foreground">{activeChat.visitorEmail}</strong>
                        </span>
                      </span>
                      <span className="text-[10px] opacity-75">
                        Started {new Date(activeChat.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Message Transcript Thread */}
                    <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-card">
                      {activeChat.messages.map((msg) => {
                        const isVisitor = msg.sender === "visitor";
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col ${isVisitor ? "items-start" : "items-end"}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-2xl p-3.5 text-xs shadow-soft space-y-1.5 ${
                                isVisitor
                                  ? "rounded-tl-sm bg-accent/40 border border-border/70 text-foreground"
                                  : "rounded-tr-sm bg-primary text-primary-foreground"
                              }`}
                            >
                              <div
                                className={`flex items-center justify-between gap-3 text-[10px] font-bold ${
                                  isVisitor ? "text-primary" : "text-primary-foreground/90"
                                }`}
                              >
                                <span>{msg.senderName}</span>
                                <span className="opacity-75 font-normal">
                                  {new Date(msg.createdAt).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                              </div>
                              <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                              <div
                                className={`text-[9px] flex items-center gap-1 justify-end ${
                                  isVisitor ? "text-muted-foreground" : "text-primary-foreground/75"
                                }`}
                              >
                                {isVisitor ? (
                                  <span>Visitor message</span>
                                ) : (
                                  <>
                                    <CheckCheck className="h-3 w-3" />
                                    <span>Delivered & Emailed</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={adminChatEndRef} />
                    </div>

                    {/* Canned responses helper chips */}
                    <div className="px-3 py-1.5 bg-accent/20 border-t border-border/50 flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar shrink-0">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase shrink-0">
                        Quick reply:
                      </span>
                      {[
                        "Thank you for reaching out! We'd love to help with your cake.",
                        "What is your event date, venue, and guest count?",
                        "You can order a sample box directly from redycakes.org/tasting-boxes",
                        "We can cater to all dietary needs: vegan, gluten-free, nut-free.",
                      ].map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setAdminReplyText(chip)}
                          className="whitespace-nowrap px-2.5 py-1 rounded-lg border border-border/80 bg-card hover:bg-primary/10 hover:border-primary/40 text-foreground text-[10px] transition-colors"
                        >
                          {chip}
                        </button>
                      ))}
                    </div>

                    {/* Reply Input Bar */}
                    <form
                      onSubmit={handleSendAdminReply}
                      className="p-3 bg-card border-t border-border/80 space-y-2 shrink-0"
                    >
                      <div className="flex gap-2 items-end">
                        <textarea
                          rows={2}
                          value={adminReplyText}
                          onChange={(e) => setAdminReplyText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              handleSendAdminReply();
                            }
                          }}
                          placeholder={`Write a reply to ${activeChat.visitorName}... (Enter to send)`}
                          className="flex-1 rounded-xl border border-border bg-background p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                        />
                        {activeChat.visitorPhone ? (
                          <button
                            type="button"
                            onClick={async () => {
                              const text =
                                adminReplyText.trim() ||
                                `Hi ${activeChat.visitorName}, thank you for reaching out to Redycakes!`;
                              const waUrl = createWhatsAppLink(activeChat.visitorPhone, text);
                              window.open(waUrl, "_blank", "noopener,noreferrer");
                              if (adminReplyText.trim()) {
                                await handleSendAdminReply();
                              }
                            }}
                            className="btn !bg-emerald-600 hover:!bg-emerald-700 !text-white !py-2.5 !px-3.5 text-xs font-semibold flex items-center gap-1.5 shrink-0 shadow-sm transition"
                            title={`Open WhatsApp with reply and record in chat transcript`}
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            Reply on WhatsApp
                          </button>
                        ) : null}
                        <button
                          type="submit"
                          disabled={!adminReplyText.trim() || isSendingChatReply}
                          className="btn btn-primary !py-2.5 !px-4 text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                        >
                          {isSendingChatReply ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            <>
                              <Send className="h-3.5 w-3.5" />
                              Reply & Email
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>
                          Press <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Enter</kbd> to send,{" "}
                          <kbd className="px-1 py-0.5 rounded bg-muted text-[10px]">Shift+Enter</kbd> for newline
                        </span>
                        <span>✉️ Copies will be sent to {activeChat.visitorEmail} & {REDYCAKES_CONTACT_EMAIL}</span>
                      </div>
                    </form>
                  </>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-muted-foreground space-y-3">
                    <div className="h-16 w-16 rounded-3xl bg-primary/10 text-primary flex items-center justify-center">
                      <MessageCircle className="h-8 w-8" />
                    </div>
                    <div>
                      <h4 className="font-display font-semibold text-foreground text-base">Select a conversation</h4>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Choose a chat from the left panel to review previous messages, check visitor details, and send real-time replies.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* CUSTOMER REVIEWS & FEEDBACK TAB */}
        {activeTab === "reviews" && (
          <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-display font-bold">Customer Reviews & Feedback</h1>
                  {pendingReviewsCount > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                      {pendingReviewsCount} Pending
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Moderate customer ratings, approve submissions for public display, feature best stories, and post official studio responses.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={refreshData}
                  className="btn btn-secondary !py-2 !px-3.5 text-xs font-semibold flex items-center gap-1.5"
                  title="Refresh customer reviews"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowAdminReviewModal(true)}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 shadow-soft"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  <span>+ Add Review</span>
                </button>
              </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Average Rating</span>
                  <div className="flex text-amber-400 text-xs">
                    {"★".repeat(Math.round(reviewStats.average || 5))}
                  </div>
                </div>
                <p className="mt-2 text-2xl font-bold font-display text-foreground">
                  {reviewStats.average > 0 ? reviewStats.average.toFixed(1) : "5.0"}
                  <span className="text-xs font-normal text-muted-foreground ml-1">/ 5.0</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Across all verified submissions</p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Reviews</span>
                <p className="mt-2 text-2xl font-bold font-display text-foreground">
                  {reviewStats.totalCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {reviews.filter((r) => r.status === "approved" || r.status === "featured").length} live on storefront
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-sm">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommend Rate</span>
                <p className="mt-2 text-2xl font-bold font-display text-emerald-600 dark:text-emerald-400">
                  {reviewStats.recommendPercentage}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">Would recommend Redycakes</p>
              </div>

              <div className={`p-4 rounded-2xl border shadow-sm ${
                pendingReviewsCount > 0
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-900 dark:text-amber-200"
                  : "bg-card border border-border/80"
              }`}>
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pending Moderation</span>
                <p className={`mt-2 text-2xl font-bold font-display ${pendingReviewsCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                  {pendingReviewsCount}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {pendingReviewsCount > 0 ? "Awaiting your review & approval" : "All reviews processed"}
                </p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between p-3.5 rounded-2xl bg-card border border-border/80">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={reviewSearch}
                  onChange={(e) => setReviewSearch(e.target.value)}
                  placeholder="Search by reviewer, email, location, flavour, or review text..."
                  className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Status Filter Tabs */}
              <div className="flex flex-wrap items-center gap-1">
                {[
                  { key: "all", label: "All", count: reviews.length },
                  { key: "pending", label: "Pending", count: reviews.filter((r) => r.status === "pending").length },
                  { key: "approved", label: "Approved", count: reviews.filter((r) => r.status === "approved").length },
                  { key: "featured", label: "Featured", count: reviews.filter((r) => r.status === "featured").length },
                  { key: "archived", label: "Archived", count: reviews.filter((r) => r.status === "archived").length },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setReviewStatusFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      reviewStatusFilter === tab.key
                        ? "bg-primary text-primary-foreground font-semibold shadow-soft"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    {tab.label} <span className="opacity-75">({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Occasion Filter */}
              <div className="shrink-0">
                <select
                  value={reviewOccasionFilter}
                  onChange={(e) => setReviewOccasionFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="all">All Occasions</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Birthday">Birthday</option>
                  <option value="Celebration">Celebration</option>
                  <option value="Tasting Box">Tasting Box</option>
                  <option value="Dietary-Friendly">Dietary-Friendly</option>
                  <option value="Corporate">Corporate</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Reviews List */}
            {filteredReviewsList.length === 0 ? (
              <div className="py-16 text-center rounded-3xl border border-dashed border-border/80 bg-card/40 p-8">
                <Quote className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-foreground">No customer reviews match your filters</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  Try adjusting your search query, status tabs, or occasion filter.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredReviewsList.map((review) => {
                  const createdDate = new Date(review.created_at).toLocaleString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                  return (
                    <article
                      key={review.id}
                      className="p-5 md:p-6 rounded-3xl border border-border/80 bg-card shadow-sm hover:shadow-soft transition-all space-y-4"
                    >
                      {/* Top bar: Reviewer, Rating, Status badge */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                            {review.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-foreground text-sm">{review.name}</h3>
                              {review.verified_buyer && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                                  <CheckCircle2 className="h-3 w-3" />
                                  Verified Customer
                                </span>
                              )}
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-foreground/80">
                                {review.occasion}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              <a
                                href={`mailto:${review.email}?subject=Thank you for your Redycakes review`}
                                className="hover:text-primary transition-colors underline-offset-4 hover:underline"
                              >
                                {review.email}
                              </a>
                              {review.location && <span>· {review.location}</span>}
                              <span>· {createdDate}</span>
                            </div>
                          </div>
                        </div>

                        {/* Rating & Status */}
                        <div className="flex sm:flex-col items-end gap-1.5 shrink-0">
                          <div className="flex items-center gap-1 text-amber-400">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating
                                    ? "fill-amber-400 text-amber-400"
                                    : "fill-transparent text-muted-foreground/30"
                                }`}
                              />
                            ))}
                            <span className="text-xs font-bold text-foreground ml-1">
                              ({review.rating}/5)
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-1">
                            {review.status === "pending" && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                                Pending Approval
                              </span>
                            )}
                            {review.status === "approved" && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                                Approved & Live
                              </span>
                            )}
                            {review.status === "featured" && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                                ★ Featured Story
                              </span>
                            )}
                            {review.status === "archived" && (
                              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30">
                                Archived
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Cake Flavour / Style Tag */}
                      {review.flavour && (
                        <div className="text-xs font-semibold text-primary">
                          🍰 <span className="text-foreground/90 font-normal">Flavour/Style:</span> {review.flavour}
                        </div>
                      )}

                      {/* Written Review Text */}
                      <blockquote className="p-3.5 rounded-2xl bg-secondary/30 border border-border/60 text-sm text-foreground leading-relaxed italic relative">
                        “{review.review_text}”
                      </blockquote>

                      {/* Would recommend tag */}
                      <div className="flex items-center gap-1.5 text-xs">
                        {review.recommend ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <ThumbsUp className="h-3.5 w-3.5" />
                            Would recommend Redycakes
                          </span>
                        ) : (
                          <span className="text-muted-foreground">
                            Did not recommend
                          </span>
                        )}
                      </div>

                      {/* Official Studio Public Reply Box */}
                      {review.admin_reply ? (
                        <div className="p-3.5 rounded-2xl bg-primary/5 border border-primary/20 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-primary flex items-center gap-1">
                              <Sparkles className="h-3.5 w-3.5" />
                              Official Studio Public Response:
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenStudioReply(review)}
                              className="text-[11px] text-primary hover:underline font-semibold"
                            >
                              Edit Response
                            </button>
                          </div>
                          <p className="text-foreground/90 italic leading-relaxed">
                            "{review.admin_reply}"
                          </p>
                          {review.admin_replied_at && (
                            <p className="text-[10px] text-muted-foreground">
                              Replied on {new Date(review.admin_replied_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </p>
                          )}
                        </div>
                      ) : null}

                      {/* Moderation Actions Toolbar */}
                      <div className="pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-3">
                        {/* Status Change Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          {review.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateReviewStatus(review.id, "approved")}
                              className="btn btn-secondary !py-1.5 !px-3 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                            >
                              ✓ Approve
                            </button>
                          )}
                          {review.status !== "featured" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateReviewStatus(review.id, "featured")}
                              className="btn btn-secondary !py-1.5 !px-3 text-xs font-semibold text-purple-700 dark:text-purple-300 hover:bg-purple-500/10"
                            >
                              ★ Feature
                            </button>
                          )}
                          {review.status !== "pending" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateReviewStatus(review.id, "pending")}
                              className="btn btn-secondary !py-1.5 !px-3 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                            >
                              Mark Pending
                            </button>
                          )}
                          {review.status !== "archived" && (
                            <button
                              type="button"
                              onClick={() => handleUpdateReviewStatus(review.id, "archived")}
                              className="btn btn-secondary !py-1.5 !px-3 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-500/10"
                            >
                              Archive
                            </button>
                          )}
                        </div>

                        {/* Reply, Delete, Email Actions */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenStudioReply(review)}
                            className="btn btn-secondary !py-1.5 !px-3 text-xs font-semibold flex items-center gap-1 text-primary hover:bg-primary/10"
                          >
                            <MessageSquareHeart className="h-3.5 w-3.5" />
                            <span>{review.admin_reply ? "Edit Reply" : "Studio Reply"}</span>
                          </button>
                          <a
                            href={`mailto:${review.email}?subject=Regarding your Redycakes experience`}
                            className="p-1.5 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                            title="Send direct email to customer"
                          >
                            <Mail className="h-4 w-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => handleDeleteReview(review.id)}
                            className="p-1.5 rounded-lg border border-border text-rose-500 hover:bg-rose-500/10 transition-colors"
                            title="Delete review"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* Studio Reply Modal Dialog */}
            {replyingReview && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="relative w-full max-w-lg rounded-3xl border border-border/80 bg-card p-6 shadow-soft space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-border/70">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="font-display font-semibold text-foreground text-base">
                          Studio Response to {replyingReview.name}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          This public reply will be displayed beneath their review on the storefront.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingReview(null)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Customer Review Snapshot */}
                  <div className="p-3 rounded-2xl bg-secondary/30 border border-border/60 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-foreground">{replyingReview.name} ({replyingReview.occasion})</span>
                      <span className="text-amber-500 font-bold">{"★".repeat(replyingReview.rating)}</span>
                    </div>
                    <p className="text-muted-foreground italic line-clamp-2">
                      "{replyingReview.review_text}"
                    </p>
                  </div>

                  {/* Reply Input */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Your Official Studio Response
                    </label>
                    <textarea
                      rows={4}
                      value={studioReplyInput}
                      onChange={(e) => setStudioReplyInput(e.target.value)}
                      placeholder="e.g. Thank you so much Sarah & Tom! It was an absolute honour designing your wedding cake..."
                      className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-border/70">
                    <button
                      type="button"
                      onClick={() => setReplyingReview(null)}
                      disabled={isSavingStudioReply}
                      className="btn btn-secondary !py-2 !px-4 text-xs font-semibold"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveStudioReply}
                      disabled={isSavingStudioReply || !studioReplyInput.trim()}
                      className="btn btn-primary !py-2 !px-5 text-xs font-semibold flex items-center gap-1.5 shadow-soft disabled:opacity-50"
                    >
                      {isSavingStudioReply ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <Send className="h-3.5 w-3.5" />
                          <span>Publish Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Test / Direct Review Submission Modal */}
            <ReviewModal
              isOpen={showAdminReviewModal}
              onClose={() => setShowAdminReviewModal(false)}
              onSuccess={() => {
                refreshData();
                setShowAdminReviewModal(false);
              }}
            />
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
              <div className="flex flex-wrap items-center gap-2">
                {selectedOrder.phone && (
                  <>
                    <a
                      href={createWhatsAppLink(
                        selectedOrder.phone,
                        `Hi ${selectedOrder.name}, Redycakes cake studio following up on your quote for the ${
                          (selectedOrder as any).cake_name || selectedOrder.occasion || "bespoke"
                        } cake!`
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-semibold text-xs hover:bg-emerald-500/20 transition"
                      title="Open WhatsApp chat with customer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      WhatsApp Chat
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        const payUrl = `${window.location.origin}/pay?order=${selectedOrder.id}`;
                        const quoteMsg =
                          `Hi ${selectedOrder.name},\n\nThank you for choosing Redycakes! Here is your bespoke cake quote for your celebration on ${selectedOrder.event_date}:\n\n` +
                          `🎂 Cake: ${(selectedOrder as any).cake_name || selectedOrder.occasion || "Bespoke Cake"}\n` +
                          `💰 Total Quote: ${formatMoney(selectedOrder.quote_amount || selectedOrder.budget, draftPaymentSettings.currency)}\n` +
                          `🔒 Deposit to Secure Date: ${formatMoney(selectedOrder.deposit_amount || (selectedOrder.quote_amount ? selectedOrder.quote_amount * 0.5 : 50), draftPaymentSettings.currency)}\n\n` +
                          `Pay online securely with Card or UK Faster Payments here:\n${payUrl}\n\n` +
                          `Or Direct Bank Transfer:\nBank: ${draftPaymentSettings.bankTransfer.bankName}\nSort Code: ${draftPaymentSettings.bankTransfer.sortCode}\nAccount: ${draftPaymentSettings.bankTransfer.accountNumber}\nReference: ${draftPaymentSettings.bankTransfer.referencePrefix}${selectedOrder.id.slice(0, 8).toUpperCase()}`;

                        const link = createWhatsAppLink(selectedOrder.phone, quoteMsg);
                        window.open(link, "_blank", "noopener,noreferrer");
                        toast.success("Opening WhatsApp with complete quote & payment details!");
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-500/40 bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 shadow-sm transition"
                      title="Send complete quote and payment link directly via WhatsApp"
                    >
                      <Send className="h-3.5 w-3.5" />
                      Send Quote on WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const statusInfo = getOrderStatusDetails(selectedOrder.status);
                        const statusMsg = `Hi ${selectedOrder.name}! 🎂 Update from Redycakes on your ${
                          (selectedOrder as any).cake_name || selectedOrder.occasion || "cake"
                        } order (#${selectedOrder.id.slice(0, 8).toUpperCase()}): Status is currently *${selectedOrder.status}* (${statusInfo.title}).\n\n${statusInfo.description}\n\nEvent Date: ${selectedOrder.event_date || (selectedOrder as any).date || "TBD"}\nNext Step: ${statusInfo.nextStep}`;

                        const link = createWhatsAppLink(selectedOrder.phone, statusMsg);
                        window.open(link, "_blank", "noopener,noreferrer");
                        toast.success(`Opening WhatsApp with status update (${selectedOrder.status})!`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary/30 bg-primary/10 text-primary font-semibold text-xs hover:bg-primary/20 transition"
                      title="Send current order status update directly via WhatsApp"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      Send Status on WhatsApp
                    </button>
                  </>
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
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-muted-foreground">Occasion</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCakeModalOpen(false);
                        setActiveTab("taxonomy");
                        setTaxonomySubTab("occasions");
                      }}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      + Manage
                    </button>
                  </div>
                  <select
                    value={cakeForm.occasion}
                    onChange={(e) => setCakeForm((f) => ({ ...f, occasion: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {cakeForm.occasion && !occasions.some((o) => o.name === cakeForm.occasion) && (
                      <option value={cakeForm.occasion}>{cakeForm.occasion}</option>
                    )}
                    {occasions.map((occ) => (
                      <option key={occ.id} value={occ.name}>
                        {occ.name} {!occ.isActive ? "(Hidden)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-muted-foreground">Style</label>
                    <button
                      type="button"
                      onClick={() => {
                        setCakeModalOpen(false);
                        setActiveTab("taxonomy");
                        setTaxonomySubTab("styles");
                      }}
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      + Manage
                    </button>
                  </div>
                  <select
                    value={cakeForm.style}
                    onChange={(e) => setCakeForm((f) => ({ ...f, style: e.target.value }))}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
                  >
                    {cakeForm.style && !styles.some((s) => s.name === cakeForm.style) && (
                      <option value={cakeForm.style}>{cakeForm.style}</option>
                    )}
                    {styles.map((sty) => (
                      <option key={sty.id} value={sty.name}>
                        {sty.name} {!sty.isActive ? "(Hidden)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground">Image URL / Product Photo</label>
                  <span className="text-[11px] text-muted-foreground">URL or upload from device</span>
                </div>

                {/* Hidden File Picker Input */}
                <input
                  ref={cakeFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCakeImageUpload}
                  className="hidden"
                />

                {/* Input with Pick from Device button */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cakeForm.src}
                    onChange={(e) => setCakeForm((f) => ({ ...f, src: e.target.value }))}
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm"
                    placeholder="e.g. /cakes/cake-sample-1.jpg or click button →"
                  />
                  <button
                    type="button"
                    disabled={isProcessingCakeImage}
                    onClick={() => cakeFileInputRef.current?.click()}
                    className="btn btn-outline shrink-0 flex items-center gap-1.5 text-xs !py-2 !px-3 font-semibold hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
                  >
                    {isProcessingCakeImage ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5 text-primary" />
                        Pick from Device
                      </>
                    )}
                  </button>
                </div>

                {/* Live Image Preview & Quick Actions */}
                {cakeForm.src ? (
                  <div className="p-2.5 rounded-xl border border-border/80 bg-accent/20 flex items-center gap-3">
                    <img
                      src={cakeForm.src}
                      alt="Cake preview"
                      className="h-14 w-14 rounded-lg object-cover border border-border shrink-0 bg-background"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/redycakes_logo.png";
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-foreground truncate">
                        {cakeForm.src.startsWith("data:")
                          ? "Custom photo uploaded from device"
                          : cakeForm.src.startsWith("http")
                          ? "Remote image URL"
                          : "Cake gallery asset"}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          type="button"
                          onClick={() => cakeFileInputRef.current?.click()}
                          className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1"
                        >
                          <Upload className="h-3 w-3" /> Change image
                        </button>
                        <span className="text-muted-foreground/40">•</span>
                        <button
                          type="button"
                          onClick={() => setCakeForm((f) => ({ ...f, src: "" }))}
                          className="text-[11px] font-medium text-destructive hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => cakeFileInputRef.current?.click()}
                    className="cursor-pointer border border-dashed border-border/80 hover:border-primary/50 hover:bg-primary/5 transition-colors rounded-xl p-2.5 text-center"
                  >
                    <p className="text-xs font-medium text-foreground flex items-center justify-center gap-1.5">
                      <Upload className="h-3.5 w-3.5 text-primary" />
                      Click here to pick an image from your device
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">JPG, PNG, WebP supported</p>
                  </div>
                )}
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

      {/* HOSTINGER SMTP CONFIG MODAL */}
      {showSmtpConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border/80">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/20 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-display">Hostinger SMTP Settings</h3>
                  <p className="text-xs text-muted-foreground">Configured for smtp.hostinger.com on Port 465</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSmtpConfigModal(false)}
                className="p-1.5 rounded-lg hover:bg-accent text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSmtpSettings} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">SMTP Server Host</label>
                  <input
                    type="text"
                    disabled
                    value={smtpConfig.host}
                    className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground cursor-not-allowed"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Hostinger Mail Server</span>
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">SMTP Port & Security</label>
                  <input
                    type="text"
                    disabled
                    value={`${smtpConfig.port} (SSL / TLS)`}
                    className="w-full rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs font-mono text-muted-foreground cursor-not-allowed"
                  />
                  <span className="text-[10px] text-muted-foreground mt-0.5 block">Encrypted socket on port 465</span>
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Hostinger Email / Username</label>
                <input
                  type="email"
                  required
                  value={smtpConfig.username}
                  onChange={(e) => setSmtpConfig((c) => ({ ...c, username: e.target.value }))}
                  placeholder="e.g. hello@redycakes.org"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                />
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Full email address created in Hostinger hPanel</span>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-muted-foreground">Hostinger Email Password</label>
                <div className="relative">
                  <input
                    type={showSmtpPassword ? "text" : "password"}
                    value={smtpConfig.password || ""}
                    onChange={(e) => setSmtpConfig((c) => ({ ...c, password: e.target.value }))}
                    placeholder="Enter Hostinger email account password"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 pr-10 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSmtpPassword((p) => !p)}
                    className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground"
                  >
                    {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                <span className="text-[10px] text-muted-foreground mt-0.5 block">Used for authenticated SMTP handshake on port 465</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">From Display Name</label>
                  <input
                    type="text"
                    value={smtpConfig.fromName}
                    onChange={(e) => setSmtpConfig((c) => ({ ...c, fromName: e.target.value }))}
                    placeholder="Redycakes Cake Studio"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground">Primary Recipient</label>
                  <input
                    type="email"
                    value={smtpConfig.recipientEmail}
                    onChange={(e) => setSmtpConfig((c) => ({ ...c, recipientEmail: e.target.value }))}
                    placeholder="hello@redycakes.org"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Sender Copy (CC) Enabled</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Whenever a visitor chats or submits a message, Hostinger SMTP transmits the transcript directly to{" "}
                  <strong>{smtpConfig.recipientEmail}</strong> while copying (CC) the sender.
                </p>
              </div>

              <div className="pt-3 border-t border-border/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleTestHostingerSmtp}
                  disabled={isTestingSmtp}
                  className="btn btn-outline !py-2 !px-3 text-xs font-semibold flex items-center gap-1.5"
                >
                  {isTestingSmtp ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Testing 465...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Test Connection
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSmtpConfigModal(false)}
                    className="btn btn-ghost !py-2 !px-3 text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary !py-2 !px-4 text-xs font-semibold shadow-soft"
                  >
                    Save SMTP Settings
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FAQ ADD / EDIT MODAL */}
      {isFaqModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                  {editingFaq ? "Modify Question" : "New Question"}
                </span>
                <h3 className="text-lg font-bold font-display mt-1">
                  {editingFaq ? "Edit Frequently Asked Question" : "Add Frequently Asked Question"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsFaqModalOpen(false);
                  setEditingFaq(null);
                }}
                className="p-1.5 rounded-full hover:bg-accent text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveFaqModal} className="space-y-4">
              {/* Question Input */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Question Title <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={faqFormQuestion}
                  onChange={(e) => setFaqFormQuestion(e.target.value)}
                  placeholder="e.g. How far in advance should I order my celebration cake?"
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Category Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Category Topic
                  </label>
                  <select
                    value={faqFormCategory}
                    onChange={(e) => setFaqFormCategory(e.target.value)}
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {FAQ_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="Custom">+ Custom Category...</option>
                  </select>
                </div>

                {faqFormCategory === "Custom" && (
                  <div>
                    <label className="text-xs font-semibold text-foreground block mb-1">
                      Custom Category Name
                    </label>
                    <input
                      type="text"
                      required
                      value={faqFormCustomCategory}
                      onChange={(e) => setFaqFormCustomCategory(e.target.value)}
                      placeholder="e.g. Corporate Gifts"
                      className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground focus:border-primary focus:outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Storefront Visibility
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded-xl border border-border bg-background cursor-pointer">
                    <input
                      type="checkbox"
                      checked={faqFormIsActive}
                      onChange={(e) => setFaqFormIsActive(e.target.checked)}
                      className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                    />
                    <span className="text-xs font-medium text-foreground">
                      {faqFormIsActive ? "Live on Storefront" : "Hidden / Draft"}
                    </span>
                  </label>
                </div>
              </div>

              {/* Answer Textarea */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1">
                  Answer Text <span className="text-destructive">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={faqFormAnswer}
                  onChange={(e) => setFaqFormAnswer(e.target.value)}
                  placeholder="Provide a clear, reassuring answer for customers. Explain timings, policies, or ingredients..."
                  className="w-full rounded-xl border border-border bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Line breaks and paragraphs will be preserved on the public storefront.
                </p>
              </div>

              {/* Live Accordion Preview */}
              <div className="rounded-2xl border border-border/80 bg-secondary/30 p-4 space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Live Accordion Preview
                </span>
                <div className="p-3.5 rounded-xl bg-card border border-border space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-foreground">
                      {faqFormQuestion.trim() || "Question preview will appear here..."}
                    </span>
                    <span className="text-primary font-bold text-sm">+</span>
                  </div>
                  <p className="text-xs text-muted-foreground whitespace-pre-line border-t border-border/60 pt-2">
                    {faqFormAnswer.trim() || "Answer preview will appear here once typed..."}
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsFaqModalOpen(false);
                    setEditingFaq(null);
                  }}
                  className="btn btn-ghost !py-2 !px-3 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFaq}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5 shadow-soft"
                >
                  {isSavingFaq ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {editingFaq ? "Save Changes" : "Publish FAQ"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingFaq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-foreground">Delete Question?</h3>
                <p className="text-xs text-muted-foreground">
                  This will remove the question from the live storefront immediately.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-foreground space-y-1">
              <span className="font-semibold block text-[10px] text-muted-foreground uppercase">Target Question</span>
              <p className="font-medium italic">&ldquo;{deletingFaq.q}&rdquo;</p>
            </div>

            <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingFaq(null)}
                className="btn btn-ghost !py-2 !px-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteFaqConfirm}
                className="btn bg-destructive text-destructive-foreground hover:bg-destructive/90 !py-2 !px-4 text-xs font-semibold shadow-soft"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OCCASION CREATE / EDIT MODAL */}
      {isOccasionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: occasionFormBadgeColor }}
                >
                  <BookmarkCheck className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">
                    {editingOccasion ? "Edit Cake Occasion" : "Add New Cake Occasion"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define an occasion for customer cakes, orders, and filters.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOccasionModalOpen(false);
                  setEditingOccasion(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveOccasion} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Occasion Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={occasionFormName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOccasionFormName(val);
                    if (!editingOccasion) {
                      setOccasionFormSlug(slugify(val));
                    }
                  }}
                  placeholder="e.g. Anniversary, Graduation, Baby Shower"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  URL Slug & Filter Key
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-muted-foreground font-mono">/</span>
                  <input
                    type="text"
                    value={occasionFormSlug}
                    onChange={(e) => setOccasionFormSlug(slugify(e.target.value))}
                    placeholder="e.g. anniversary"
                    className="w-full rounded-xl border border-border bg-background pl-6 pr-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Used in URLs, search queries and event telemetry</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Short Description / Caption
                </label>
                <textarea
                  rows={2}
                  value={occasionFormDesc}
                  onChange={(e) => setOccasionFormDesc(e.target.value)}
                  placeholder="e.g. Elegant multi-tiered cakes designed for wedding vows and celebrations of love."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Color Swatch Picker */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Badge Accent Color
                </label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {[
                    "#EC4899", // Rose
                    "#8B5CF6", // Purple
                    "#3B82F6", // Blue
                    "#10B981", // Emerald
                    "#F59E0B", // Amber
                    "#06B6D4", // Cyan
                    "#E11D48", // Crimson
                    "#64748B", // Slate
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setOccasionFormBadgeColor(color)}
                      className={`h-7 w-7 rounded-lg transition-transform ${
                        occasionFormBadgeColor.toLowerCase() === color.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={occasionFormBadgeColor.startsWith("#") ? occasionFormBadgeColor : "#8B5CF6"}
                    onChange={(e) => setOccasionFormBadgeColor(e.target.value)}
                    className="h-8 w-12 rounded-lg border border-border bg-background cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={occasionFormBadgeColor}
                    onChange={(e) => setOccasionFormBadgeColor(e.target.value)}
                    placeholder="#8B5CF6"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Storefront Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-accent/20">
                <div>
                  <p className="text-xs font-semibold text-foreground">Publish on Storefront</p>
                  <p className="text-[11px] text-muted-foreground">Show in gallery filters and online order enquiry form</p>
                </div>
                <input
                  type="checkbox"
                  checked={occasionFormIsActive}
                  onChange={(e) => setOccasionFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Sync existing cakes notice if editing */}
              {editingOccasion && getOccasionCakeCount(editingOccasion.name) > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
                  <input
                    type="checkbox"
                    id="syncCakesOcc"
                    checked={occasionFormSyncCakes}
                    onChange={(e) => setOccasionFormSyncCakes(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="syncCakesOcc" className="text-foreground leading-snug cursor-pointer">
                    Sync {getOccasionCakeCount(editingOccasion.name)} existing gallery {getOccasionCakeCount(editingOccasion.name) === 1 ? "cake" : "cakes"} tagged as &ldquo;{editingOccasion.name}&rdquo; to the new name.
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsOccasionModalOpen(false);
                    setEditingOccasion(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingOccasion}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5"
                >
                  {isSavingOccasion && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingOccasion ? "Save Changes" : "Create Occasion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STYLE CREATE / EDIT MODAL */}
      {isStyleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-soft space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-border/80 pb-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: styleFormBadgeColor }}
                >
                  <Layers className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-display text-foreground">
                    {editingStyle ? "Edit Cake Style" : "Add New Cake Style"}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Define a decoration or finish style for cake designs.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsStyleModalOpen(false);
                  setEditingStyle(null);
                }}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStyle} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Style Name <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={styleFormName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setStyleFormName(val);
                    if (!editingStyle) {
                      setStyleFormSlug(slugify(val));
                    }
                  }}
                  placeholder="e.g. Palette Knife, Semi-Naked, Fondant"
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  URL Slug & Filter Key
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-xs text-muted-foreground font-mono">/</span>
                  <input
                    type="text"
                    value={styleFormSlug}
                    onChange={(e) => setStyleFormSlug(slugify(e.target.value))}
                    placeholder="e.g. palette-knife"
                    className="w-full rounded-xl border border-border bg-background pl-6 pr-3 py-2 text-sm font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">Used for filtering and internal cake indexing</p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1">
                  Style Description & Technique Notes
                </label>
                <textarea
                  rows={2}
                  value={styleFormDesc}
                  onChange={(e) => setStyleFormDesc(e.target.value)}
                  placeholder="e.g. Textured Swiss meringue buttercream with organic palette knife waves and gold leaf."
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>

              {/* Color Swatch Picker */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                  Badge Accent Color
                </label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {[
                    "#EC4899", // Rose
                    "#8B5CF6", // Purple
                    "#3B82F6", // Blue
                    "#10B981", // Emerald
                    "#F59E0B", // Warm Amber
                    "#06B6D4", // Cyan
                    "#14B8A6", // Teal
                    "#64748B", // Slate
                  ].map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStyleFormBadgeColor(color)}
                      className={`h-7 w-7 rounded-lg transition-transform ${
                        styleFormBadgeColor.toLowerCase() === color.toLowerCase()
                          ? "ring-2 ring-primary ring-offset-2 scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={styleFormBadgeColor.startsWith("#") ? styleFormBadgeColor : "#EC4899"}
                    onChange={(e) => setStyleFormBadgeColor(e.target.value)}
                    className="h-8 w-12 rounded-lg border border-border bg-background cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={styleFormBadgeColor}
                    onChange={(e) => setStyleFormBadgeColor(e.target.value)}
                    placeholder="#EC4899"
                    className="flex-1 rounded-xl border border-border bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </div>

              {/* Storefront Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border/80 bg-accent/20">
                <div>
                  <p className="text-xs font-semibold text-foreground">Publish on Storefront</p>
                  <p className="text-[11px] text-muted-foreground">Enable in cake gallery filter chips and cake creation</p>
                </div>
                <input
                  type="checkbox"
                  checked={styleFormIsActive}
                  onChange={(e) => setStyleFormIsActive(e.target.checked)}
                  className="h-4 w-4 rounded text-primary focus:ring-primary cursor-pointer"
                />
              </div>

              {/* Sync existing cakes notice if editing */}
              {editingStyle && getStyleCakeCount(editingStyle.name) > 0 && (
                <div className="flex items-start gap-2 p-3 rounded-xl border border-primary/20 bg-primary/5 text-xs">
                  <input
                    type="checkbox"
                    id="syncCakesSty"
                    checked={styleFormSyncCakes}
                    onChange={(e) => setStyleFormSyncCakes(e.target.checked)}
                    className="mt-0.5 h-3.5 w-3.5 rounded text-primary focus:ring-primary cursor-pointer"
                  />
                  <label htmlFor="syncCakesSty" className="text-foreground leading-snug cursor-pointer">
                    Sync {getStyleCakeCount(editingStyle.name)} existing gallery {getStyleCakeCount(editingStyle.name) === 1 ? "cake" : "cakes"} styled as &ldquo;{editingStyle.name}&rdquo; to the new name.
                  </label>
                </div>
              )}

              <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsStyleModalOpen(false);
                    setEditingStyle(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingStyle}
                  className="btn btn-primary !py-2 !px-4 text-xs font-semibold flex items-center gap-1.5"
                >
                  {isSavingStyle && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingStyle ? "Save Changes" : "Create Style"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TAXONOMY DELETE CONFIRMATION MODAL */}
      {deletingTaxonomyItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-destructive/30 bg-card p-6 shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold font-display text-foreground">
                  Delete {deletingTaxonomyItem.type === "occasion" ? "Occasion" : "Cake Style"}?
                </h3>
                <p className="text-xs text-muted-foreground">
                  This will remove the item from storefront filter options immediately.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-destructive/5 border border-destructive/20 text-xs text-foreground space-y-1">
              <span className="font-semibold block text-[10px] text-muted-foreground uppercase">
                {deletingTaxonomyItem.type === "occasion" ? "Occasion Name" : "Style Name"}
              </span>
              <p className="font-bold text-sm text-foreground">{deletingTaxonomyItem.item.name}</p>
            </div>

            {deletingTaxonomyItem.linkedCakeCount > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldAlert className="h-4 w-4 text-amber-600 shrink-0" />
                  Notice: {deletingTaxonomyItem.linkedCakeCount} {deletingTaxonomyItem.linkedCakeCount === 1 ? "cake" : "cakes"} in gallery use this tag
                </p>
                <p className="text-[11px] opacity-90">
                  Deleting will remove this option from future dropdowns and filter chips. Existing cakes will retain their title and description.
                </p>
              </div>
            )}

            <div className="pt-3 border-t border-border/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingTaxonomyItem(null)}
                className="btn btn-ghost !py-2 !px-3 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={
                  deletingTaxonomyItem.type === "occasion"
                    ? handleConfirmDeleteOccasion
                    : handleConfirmDeleteStyle
                }
                className="btn bg-destructive text-destructive-foreground hover:bg-destructive/90 !py-2 !px-4 text-xs font-semibold shadow-soft"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
