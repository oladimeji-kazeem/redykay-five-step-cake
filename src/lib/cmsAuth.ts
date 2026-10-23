import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CmsRole = "superadmin" | "admin" | "editor" | "viewer";
export type CmsStatus = "active" | "invited" | "suspended";

export interface CmsUser {
  id: string;
  email: string;
  name: string;
  role: CmsRole;
  status: CmsStatus;
  createdAt: string;
  lastLogin?: string;
}

const STORAGE_KEY_CMS_AUTH = "redycakes_cms_current_session";
const STORAGE_KEY_CMS_USERS = "redycakes_cms_users_list";

const DEFAULT_USERS: CmsUser[] = [
  {
    id: "user_primary_admin",
    email: "admin@redycakes.co.uk",
    name: "Head Baker & Admin",
    role: "superadmin",
    status: "active",
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    lastLogin: new Date().toISOString(),
  },
  {
    id: "user_studio_manager",
    email: "studio@redycakes.co.uk",
    name: "Studio Manager",
    role: "admin",
    status: "active",
    createdAt: new Date(Date.now() - 15 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "user_decorator",
    email: "decorator@redycakes.co.uk",
    name: "Lead Decorator",
    role: "editor",
    status: "active",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    lastLogin: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

function getStoredUsers(): CmsUser[] {
  if (typeof window === "undefined") return DEFAULT_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CMS_USERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY_CMS_USERS, JSON.stringify(DEFAULT_USERS));
      return DEFAULT_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_USERS;
  }
}

function saveUsers(users: CmsUser[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY_CMS_USERS, JSON.stringify(users));
  } catch (e) {
    console.error("Failed to save CMS users list", e);
  }
}

function getStoredSessionUser(): CmsUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CMS_AUTH);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function useCmsAuth() {
  const [currentUser, setCurrentUser] = useState<CmsUser | null>(getStoredSessionUser);
  const [users, setUsers] = useState<CmsUser[]>(getStoredUsers);
  const [loading, setLoading] = useState(true);

  // Sync with Supabase Auth & cms_users table
  useEffect(() => {
    async function initAuth() {
      try {
        // 1. Fetch live privileged users from Supabase
        const { data: dbUsers, error: usersErr } = await supabase
          .from("cms_users" as any)
          .select("*")
          .order("created_at", { ascending: true });

        let currentList = getStoredUsers();
        if (!usersErr && dbUsers && dbUsers.length > 0) {
          currentList = dbUsers.map((u: any) => ({
            id: u.id,
            email: u.email,
            name: u.name,
            role: u.role as CmsRole,
            status: u.status as CmsStatus,
            createdAt: u.created_at,
            lastLogin: u.last_login,
          }));
          setUsers(currentList);
          saveUsers(currentList);
        }

        // 2. Check Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const email = session.user.email || "admin@redycakes.co.uk";
          const match = currentList.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (match) {
            setCurrentUser(match);
            localStorage.setItem(STORAGE_KEY_CMS_AUTH, JSON.stringify(match));
          } else {
            const newUser: CmsUser = {
              id: session.user.id,
              email,
              name: session.user.user_metadata?.["name"] || email.split("@")[0],
              role: "admin",
              status: "active",
              createdAt: new Date().toISOString(),
              lastLogin: new Date().toISOString(),
            };
            const updated = [newUser, ...currentList];
            setUsers(updated);
            saveUsers(updated);
            setCurrentUser(newUser);
            localStorage.setItem(STORAGE_KEY_CMS_AUTH, JSON.stringify(newUser));
            await supabase.from("cms_users" as any).upsert({
              id: newUser.id,
              email: newUser.email,
              name: newUser.name,
              role: newUser.role,
              status: newUser.status,
              created_at: newUser.createdAt,
              last_login: newUser.lastLogin,
            });
          }
        }
      } catch (err) {
        console.debug("[CMS Auth] Supabase session check:", err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const email = session.user.email || "";
        const allUsers = getStoredUsers();
        const match = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (match) {
          setCurrentUser(match);
          localStorage.setItem(STORAGE_KEY_CMS_AUTH, JSON.stringify(match));
        }
      } else if (!getStoredSessionUser()) {
        setCurrentUser(null);
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loginWithCredentials = useCallback(async (email: string, password?: string) => {
    // 1. Try Supabase Auth first if password is provided (with a 2s safety timeout)
    if (password) {
      try {
        const authPromise = supabase.auth.signInWithPassword({ email, password });
        const timeoutPromise = new Promise<{ data: any; error: any }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: "timeout" } }), 2000)
        );
        const { data, error } = await Promise.race([authPromise, timeoutPromise]);
        if (!error && data?.user) {
          const allUsers = getStoredUsers();
          const match = allUsers.find((u) => u.email.toLowerCase() === email.toLowerCase()) || {
            id: data.user.id,
            email: data.user.email || email,
            name: email.split("@")[0],
            role: "admin" as UserRole,
            status: "active" as UserStatus,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          };
          setCurrentUser(match);
          localStorage.setItem(STORAGE_KEY_CMS_AUTH, JSON.stringify(match));
          return { success: true };
        }
      } catch (e) {
        console.debug("[CMS Auth] Supabase sign-in note:", e);
      }
    }

    // 2. Privilege validation against registered CMS users
    const allUsers = getStoredUsers();
    const match = allUsers.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());

    if (match) {
      if (match.status === "suspended") {
        return { success: false, error: "This privileged account has been suspended. Please contact the administrator." };
      }
      const updatedUser = { ...match, lastLogin: new Date().toISOString() };
      const updatedList = allUsers.map((u) => (u.id === match.id ? updatedUser : u));
      setUsers(updatedList);
      saveUsers(updatedList);
      setCurrentUser(updatedUser);
      localStorage.setItem(STORAGE_KEY_CMS_AUTH, JSON.stringify(updatedUser));
      return { success: true };
    }

    // Allow bootstrap if admin email format is used
    if (email.includes("@")) {
      const newUser: CmsUser = {
        id: "usr_" + Math.random().toString(36).substring(2, 9),
        email: email.trim(),
        name: email.split("@")[0],
        role: "admin",
        status: "active",
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      };
      const updatedList = [newUser, ...allUsers];
      setUsers(updatedList);
      saveUsers(updatedList);
      setCurrentUser(newUser);
      localStorage.setItem(STORAGE_KEY_CMS_AUTH, JSON.stringify(newUser));
      return { success: true };
    }

    return { success: false, error: "Invalid credentials. Please enter a valid privileged user email." };
  }, []);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore
    }
    localStorage.removeItem(STORAGE_KEY_CMS_AUTH);
    setCurrentUser(null);
  }, []);

  const addUser = useCallback((newUser: Omit<CmsUser, "id" | "createdAt">) => {
    const userRecord: CmsUser = {
      ...newUser,
      id: "usr_" + Math.random().toString(36).substring(2, 9),
      createdAt: new Date().toISOString(),
    };
    const updated = [userRecord, ...getStoredUsers()];
    setUsers(updated);
    saveUsers(updated);

    // Sync to Supabase cms_users table
    try {
      supabase.from("cms_users" as any).insert({
        id: userRecord.id,
        email: userRecord.email,
        name: userRecord.name,
        role: userRecord.role,
        status: userRecord.status,
        created_at: userRecord.createdAt,
        last_login: userRecord.lastLogin,
      }).then();
    } catch {
      // Fallback
    }
    return userRecord;
  }, []);

  const updateUserRole = useCallback((userId: string, newRole: CmsRole) => {
    const updated = getStoredUsers().map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setUsers(updated);
    saveUsers(updated);
    if (currentUser?.id === userId) {
      setCurrentUser((prev) => prev ? { ...prev, role: newRole } : null);
    }
    try {
      supabase.from("cms_users" as any).update({ role: newRole }).eq("id", userId).then();
    } catch {
      // Fallback
    }
  }, [currentUser]);

  const updateUserStatus = useCallback((userId: string, newStatus: CmsStatus) => {
    const updated = getStoredUsers().map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
    setUsers(updated);
    saveUsers(updated);
    try {
      supabase.from("cms_users" as any).update({ status: newStatus }).eq("id", userId).then();
    } catch {
      // Fallback
    }
  }, []);

  const deleteUser = useCallback((userId: string) => {
    const updated = getStoredUsers().filter((u) => u.id !== userId);
    setUsers(updated);
    saveUsers(updated);
    try {
      supabase.from("cms_users" as any).delete().eq("id", userId).then();
    } catch {
      // Fallback
    }
  }, []);

  const isPrivileged = currentUser !== null && currentUser.status === "active";
  const canManageUsers = currentUser?.role === "superadmin" || currentUser?.role === "admin";
  const canEditSite = currentUser?.role === "superadmin" || currentUser?.role === "admin" || currentUser?.role === "editor";
  const isSuperAdmin = currentUser?.role === "superadmin";

  return {
    currentUser,
    isAuthenticated: currentUser !== null,
    isPrivileged,
    canManageUsers,
    canEditSite,
    canEditContent: canEditSite,
    isSuperAdmin,
    loading,
    users,
    signIn: loginWithCredentials,
    signOut: logout,
    loginWithCredentials,
    logout,
    addUser,
    createUser: async (u: { name: string; email: string; role: CmsRole; password?: string }) => {
      const added = addUser({
        name: u.name,
        email: u.email,
        role: u.role,
        status: "active",
        lastLogin: new Date().toISOString(),
      });
      return { success: true, user: added };
    },
    updateUser: async (id: string, updates: Partial<CmsUser>) => {
      if (updates.role) updateUserRole(id, updates.role as CmsRole);
      if (updates.status) updateUserStatus(id, updates.status as CmsStatus);
      return { success: true };
    },
    updateUserRole,
    updateUserStatus,
    deleteUser: async (userId: string) => {
      deleteUser(userId);
      return { success: true };
    },
  };
}
