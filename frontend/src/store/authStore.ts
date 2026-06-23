"use client";
import { create } from "zustand";
import type { User } from "@/types";
import { authApi } from "@/lib/api";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  fetchMe: () => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: false,
  initialized: false,

  fetchMe: async () => {
    set({ loading: true });
    try {
      const user = await authApi.me();
      set({ user, initialized: true });
    } catch {
      set({ user: null, initialized: true });
    } finally {
      set({ loading: false });
    }
  },

  logout: async () => {
    await authApi.logout();
    set({ user: null });
    window.location.href = "/";
  },
}));
