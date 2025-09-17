import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInfiniteScrollOptions {
  threshold?: number;
  rootMargin?: string;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

interface UseInfiniteScrollReturn {
  ref: React.RefObject<HTMLElement>;
  isFetching: boolean;
}

/**
 * Hook for infinite scrolling using IntersectionObserver
 * @param fetchNextPage - Function to fetch next page of data
 * @param options - Configuration options
 * @returns Ref and loading state
 */
export function useInfiniteScroll(
  fetchNextPage: () => void,
  {
    threshold = 1.0,
    rootMargin = '100px',
    hasNextPage = true,
    isFetchingNextPage = false,
  }: UseInfiniteScrollOptions = {}
): UseInfiniteScrollReturn {
  const [isFetching, setIsFetching] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementRef = useRef<HTMLElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage && !isFetching) {
        setIsFetching(true);
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage, isFetching]
  );

  useEffect(() => {
    setIsFetching(isFetchingNextPage);
  }, [isFetchingNextPage]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Create observer
    observerRef.current = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleIntersection, threshold, rootMargin]);

  return {
    ref: elementRef,
    isFetching,
  };
}

/**
 * Hook for scroll-based infinite loading (traditional approach)
 */
export function useScrollInfiniteLoading(
  fetchMore: () => void,
  {
    threshold = 200,
    hasMore = true,
    isLoading = false,
  }: {
    threshold?: number;
    hasMore?: boolean;
    isLoading?: boolean;
  } = {}
) {
  const [loading, setLoading] = useState(false);

  const handleScroll = useCallback(() => {
    if (loading || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom < threshold) {
      setLoading(true);
      fetchMore();
    }
  }, [fetchMore, loading, hasMore, isLoading, threshold]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  return { isLoading: loading };
}

/**
 * Hook for pagination-based infinite loading
 */
export function usePaginatedInfiniteScroll<T>(
  initialData: T[] = [],
  fetchPage: (page: number) => Promise<{ data: T[]; hasMore: boolean }>,
  {
    pageSize = 20,
    threshold = 200,
  }: {
    pageSize?: number;
    threshold?: number;
  } = {}
) {
  const [data, setData] = useState<T[]>(initialData);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadNextPage = useCallback(async () => {
    if (isLoading || !hasMore) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchPage(currentPage + 1);
      
      setData(prevData => [...prevData, ...result.data]);
      setHasMore(result.hasMore);
      setCurrentPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  }, [fetchPage, currentPage, isLoading, hasMore]);

  const reset = useCallback(() => {
    setData(initialData);
    setCurrentPage(1);
    setHasMore(true);
    setIsLoading(false);
    setError(null);
  }, [initialData]);

  const infiniteScrollRef = useInfiniteScroll(loadNextPage, {
    hasNextPage: hasMore,
    isFetchingNextPage: isLoading,
    rootMargin: `${threshold}px`,
  });

  return {
    data,
    isLoading,
    hasMore,
    error,
    loadNextPage,
    reset,
    infiniteScrollRef: infiniteScrollRef.ref,
  };
}