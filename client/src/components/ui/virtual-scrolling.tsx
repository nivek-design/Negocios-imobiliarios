import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualScrollingProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  loadingComponent?: React.ReactNode;
  isLoading?: boolean;
  onEndReached?: () => void;
  endReachedThreshold?: number;
}

/**
 * Virtual scrolling component for large lists
 * Only renders visible items for optimal performance
 */
export function VirtualScrolling<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  className = '',
  onScroll,
  loadingComponent,
  isLoading = false,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualScrollingProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length - 1,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const visibleItems = useMemo(() => {
    return items.slice(startIndex, endIndex + 1);
  }, [items, startIndex, endIndex]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const currentScrollTop = e.currentTarget.scrollTop;
    setScrollTop(currentScrollTop);
    onScroll?.(currentScrollTop);

    // Check if we're near the end
    if (onEndReached && !isLoading) {
      const { scrollHeight, scrollTop: currentScroll, clientHeight } = e.currentTarget;
      if (scrollHeight - currentScroll - clientHeight < endReachedThreshold) {
        onEndReached();
      }
    }
  }, [onScroll, onEndReached, isLoading, endReachedThreshold]);

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
      data-testid="virtual-scroll-container"
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible items */}
        <div
          style={{
            transform: `translateY(${startIndex * itemHeight}px)`,
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => (
            <div
              key={startIndex + index}
              style={{ height: itemHeight }}
              data-testid={`virtual-item-${startIndex + index}`}
            >
              {renderItem(item, startIndex + index)}
            </div>
          ))}
        </div>

        {/* Loading indicator at the end */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              top: items.length * itemHeight,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
            className="flex items-center justify-center"
          >
            {loadingComponent || (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground">Carregando mais...</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Property-specific virtual scrolling component
 */
interface Property {
  id: string;
  title: string;
  [key: string]: any;
}

interface VirtualPropertyListProps {
  properties: Property[];
  renderProperty: (property: Property, index: number) => React.ReactNode;
  isLoading?: boolean;
  onLoadMore?: () => void;
  className?: string;
}

export function VirtualPropertyList({
  properties,
  renderProperty,
  isLoading = false,
  onLoadMore,
  className = '',
}: VirtualPropertyListProps) {
  const PROPERTY_CARD_HEIGHT = 400; // Height of PropertyCard component
  const CONTAINER_HEIGHT = 600; // Visible container height

  return (
    <VirtualScrolling
      items={properties}
      renderItem={renderProperty}
      itemHeight={PROPERTY_CARD_HEIGHT}
      containerHeight={CONTAINER_HEIGHT}
      overscan={3}
      className={className}
      isLoading={isLoading}
      onEndReached={onLoadMore}
      endReachedThreshold={400}
    />
  );
}

/**
 * Grid-based virtual scrolling for property cards
 */
interface VirtualPropertyGridProps {
  properties: Property[];
  renderProperty: (property: Property, index: number) => React.ReactNode;
  isLoading?: boolean;
  onLoadMore?: () => void;
  className?: string;
  columns?: number;
}

export function VirtualPropertyGrid({
  properties,
  renderProperty,
  isLoading = false,
  onLoadMore,
  className = '',
  columns = 3,
}: VirtualPropertyGridProps) {
  const PROPERTY_CARD_HEIGHT = 400;
  const CONTAINER_HEIGHT = 800;

  // Group properties into rows
  const rows = useMemo(() => {
    const grouped = [];
    for (let i = 0; i < properties.length; i += columns) {
      grouped.push(properties.slice(i, i + columns));
    }
    return grouped;
  }, [properties, columns]);

  const renderRow = useCallback((row: Property[], rowIndex: number) => {
    return (
      <div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4"
        style={{ minHeight: PROPERTY_CARD_HEIGHT }}
        data-testid={`property-row-${rowIndex}`}
      >
        {row.map((property, columnIndex) => (
          <div key={property.id} data-testid={`property-grid-item-${rowIndex}-${columnIndex}`}>
            {renderProperty(property, rowIndex * columns + columnIndex)}
          </div>
        ))}
      </div>
    );
  }, [renderProperty, columns]);

  return (
    <VirtualScrolling
      items={rows}
      renderItem={renderRow}
      itemHeight={PROPERTY_CARD_HEIGHT + 24} // Add gap space
      containerHeight={CONTAINER_HEIGHT}
      overscan={2}
      className={className}
      isLoading={isLoading}
      onEndReached={onLoadMore}
      endReachedThreshold={400}
    />
  );
}

/**
 * Skeleton loader for virtual scrolling
 */
export function VirtualScrollingSkeleton({
  itemHeight = 400,
  containerHeight = 600,
  itemsCount = 10,
}: {
  itemHeight?: number;
  containerHeight?: number;
  itemsCount?: number;
}) {
  const visibleItemsCount = Math.ceil(containerHeight / itemHeight);
  
  return (
    <div style={{ height: containerHeight }} className="space-y-4">
      {Array.from({ length: Math.min(visibleItemsCount, itemsCount) }).map((_, index) => (
        <div key={index} style={{ height: itemHeight }} className="p-4">
          <Skeleton className="w-full h-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}