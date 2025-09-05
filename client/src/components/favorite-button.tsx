import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/contexts/I18nContext";
import { isUnauthorizedError } from "@/lib/authUtils";

interface FavoriteButtonProps {
  propertyId: string;
  className?: string;
}

export default function FavoriteButton({ propertyId, className }: FavoriteButtonProps) {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();

  // Check if property is favorited
  const { data: favoriteStatus, isLoading } = useQuery<{ isFavorited: boolean }>({
    queryKey: ["/api/properties", propertyId, "is-favorited"],
    enabled: isAuthenticated,
    retry: false,
  });

  const isFavorited = favoriteStatus?.isFavorited || false;

  // Add to favorites mutation
  const addToFavoritesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/properties/${propertyId}/favorite`);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('property.addedToFavorites'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "is-favorited"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/metrics"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('property.failedToAddToFavorites'),
        variant: "destructive",
      });
    },
  });

  // Remove from favorites mutation
  const removeFromFavoritesMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/properties/${propertyId}/favorite`);
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('property.removedFromFavorites'),
      });
      queryClient.invalidateQueries({ queryKey: ["/api/properties", propertyId, "is-favorited"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/favorites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/metrics"] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: t('common.error'),
        description: t('property.failedToRemoveFromFavorites'),
        variant: "destructive",
      });
    },
  });

  const handleToggleFavorite = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save favorites",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }

    if (isFavorited) {
      removeFromFavoritesMutation.mutate();
    } else {
      addToFavoritesMutation.mutate();
    }
  };

  const isPending = addToFavoritesMutation.isPending || removeFromFavoritesMutation.isPending;

  return (
    <Button
      variant={isFavorited ? "default" : "outline"}
      size="sm"
      onClick={handleToggleFavorite}
      disabled={isPending || isLoading}
      className={className}
      data-testid={`button-favorite-${propertyId}`}
    >
      <Heart 
        className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-current' : ''}`}
      />
      {isFavorited ? t('property.removeFavorite') : t('property.addToFavorites')}
    </Button>
  );
}