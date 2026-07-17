/**
 * A buyer's favorited shops (Browse Shops → Favorites).
 *
 * Backed by the backend `shop_favorites` table and keyed by ShopResult.id.
 * Mirrors useUserQuotes: local state + a same-tab CustomEvent bus so the
 * All-Shops grid, the Favorites grid, and the sidebar count all resync after
 * any toggle without prop drilling.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchFavoriteShopIds,
  favoriteShop,
  unfavoriteShop,
} from '../services/api/shopService';

const FAVORITES_CHANGED_EVENT = 'tonse:favorites-changed';

/** Notify every mounted useFavoriteShops instance to resync from the backend. */
export function notifyFavoritesChanged() {
  window.dispatchEvent(new Event(FAVORITES_CHANGED_EVENT));
}

export function useFavoriteShops(userId?: string) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFavoriteIds(new Set());
      setLoading(false);
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const ids = await fetchFavoriteShopIds();
        if (!cancelled) setFavoriteIds(new Set(ids));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    const onChanged = () => load();
    window.addEventListener(FAVORITES_CHANGED_EVENT, onChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(FAVORITES_CHANGED_EVENT, onChanged);
    };
  }, [userId]);

  const isFavorite = useCallback((shopId: string) => favoriteIds.has(shopId), [favoriteIds]);

  const toggle = useCallback(
    async (shopId: string) => {
      if (!userId) return;
      const currentlyFav = favoriteIds.has(shopId);
      // Optimistic flip for instant heart feedback.
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (currentlyFav) next.delete(shopId);
        else next.add(shopId);
        return next;
      });
      try {
        if (currentlyFav) await unfavoriteShop(shopId);
        else await favoriteShop(shopId);
        // Server is now consistent — let other mounted instances resync.
        notifyFavoritesChanged();
      } catch {
        // Revert on failure.
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (currentlyFav) next.add(shopId);
          else next.delete(shopId);
          return next;
        });
      }
    },
    [userId, favoriteIds],
  );

  return { favoriteIds, isFavorite, toggle, loading };
}
