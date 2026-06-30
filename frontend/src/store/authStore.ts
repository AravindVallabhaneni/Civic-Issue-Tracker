import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '../types';

interface AuthState {
  user: User | null;
  session: Session | null;
  role: UserRole;
  departmentId: string | null;
  loading: boolean;
  
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  role: 'citizen',
  departmentId: null,
  loading: true,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, department_id')
        .eq('id', session.user.id)
        .single();
      
      set({
        user: session.user,
        session,
        role: profile?.role as UserRole || 'citizen',
        departmentId: profile?.department_id || null,
        loading: false,
      });
    } else {
      set({ loading: false });
    }

    // Listen for auth changes
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, department_id')
          .eq('id', session.user.id)
          .single();
        
        set({
          user: session.user,
          session,
          role: profile?.role as UserRole || 'citizen',
          departmentId: profile?.department_id || null,
        });
      } else {
        set({ user: null, session: null, role: 'citizen', departmentId: null });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, fullName) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role: 'citizen' },
      },
    });
    if (error) throw error;
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, session: null, role: 'citizen', departmentId: null });
  },
}));
