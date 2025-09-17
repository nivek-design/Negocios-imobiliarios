import { useContext, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/contexts/AuthContext";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { user, isLoading, signOut } = context;
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      
      // FIXED: Call both Supabase signOut AND server logout endpoint
      // This ensures both client-side and server-side cleanup happens properly
      await Promise.allSettled([
        // 1. Supabase signOut (clears Supabase session)
        signOut(),
        // 2. Server logout endpoint (clears server cookies and session)
        fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include', // Include cookies for proper server-side cleanup
        })
      ]);
      
      // Clear query cache
      queryClient.clear();
      
      // Clear any local storage
      localStorage.removeItem('authToken');
      
      toast({
        title: "Logout realizado com sucesso",
        description: "Você foi desconectado do sistema.",
      });
      
      // Force page reload to ensure clean state
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    } catch (error: any) {
      toast({
        title: "Erro no logout",
        description: error.message || "Erro inesperado ao fazer logout.",
        variant: "destructive",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    logout,
    isLoggingOut,
  };
}
