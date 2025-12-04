"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeedPosts, getAllTags } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { useEffect, useState, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Page, Navbar } from "konsta/react";
import { useSearchParams, useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { Search, X } from "lucide-react";
import SearchModal from "@/components/SearchModal";

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';
  
  // Calculate items per load and rootMargin based on viewport height
  const [itemsPerLoad, setItemsPerLoad] = useState(4);
  const [rootMargin, setRootMargin] = useState('0px');
  
  useEffect(() => {
    // Calculate items to load based on viewport height
    // Each card is approximately 250px tall (aspect 4/5 with margins)
    // We want to load enough to fill viewport + some buffer
    const calculateLoadParams = () => {
      const viewportHeight = window.innerHeight;
      
      // Calculate how many rows fit in viewport (each row is ~250px with margins)
      const cardHeight = 250; // Approximate height of card with margins
      const rowsInViewport = Math.ceil(viewportHeight / cardHeight);
      
      // Load 2 rows worth of items (2 columns = 4 items per row)
      // For small screens: 4 items (1 viewport)
      // For medium screens: 6 items (1.5 viewport)
      // For large screens: 8 items (2 viewport)
      let items = 4; // Default for small screens
      if (viewportHeight >= 800) {
        items = 8; // Large screens
      } else if (viewportHeight >= 600) {
        items = 6; // Medium screens
      }
      
      setItemsPerLoad(items);
      setRootMargin(`${viewportHeight}px 0px`);
    };
    
    calculateLoadParams();
    window.addEventListener('resize', calculateLoadParams);
    return () => window.removeEventListener('resize', calculateLoadParams);
  }, []);
  
  // Configure intersection observer for smooth loading - trigger at 75% viewport scroll
  const { ref, inView } = useInView({
    threshold: 0.1,
    rootMargin: rootMargin,
    triggerOnce: false, // Allow multiple triggers
    // Skip initial trigger to prevent immediate fetch on mount
    skip: false,
  });

  // Search modal state
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [allTags, setAllTags] = useState<any[]>([]);

  // Tag filter state from URL - support multiple tags
  const selectedTagIds = useMemo(() => {
    const tagIdsParam = searchParams.get("tagIds");
    if (!tagIdsParam) return [];
    return tagIdsParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
  }, [searchParams]);

  // Stable query key - use empty string for no tags instead of empty array join
  const tagIdsKey = useMemo(() => {
    return selectedTagIds.length > 0 ? selectedTagIds.join(',') : '';
  }, [selectedTagIds]);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["feed", tagIdsKey, itemsPerLoad], // Refetch when tags or itemsPerLoad changes
    queryFn: ({ pageParam }) => {
      // Don't pass undefined - pass empty array or omit the parameter
      const params: { pageParam: number; limit: number; tagIds?: number[] } = {
        pageParam,
        limit: itemsPerLoad,
      };
      if (selectedTagIds.length > 0) {
        params.tagIds = selectedTagIds;
      }
      return getFeedPosts(params);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
    // Prevent automatic refetching on window focus or reconnect
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    // Prevent refetching on mount if data exists
    refetchOnMount: false,
  });

  // Immediate loading when in view - prevent duplicate calls with stricter checks
  const lastFetchPageRef = useRef<number | null>(null);
  const isFetchingRef = useRef(false);
  
  useEffect(() => {
    // Only fetch if all conditions are met and we're not already fetching
    if (inView && hasNextPage && !isFetchingNextPage && !isFetchingRef.current) {
      const currentPage = data?.pages.length || 0;
      // Only fetch if this is a new page we haven't fetched yet
      if (lastFetchPageRef.current !== currentPage) {
        lastFetchPageRef.current = currentPage;
        isFetchingRef.current = true;
        fetchNextPage().finally(() => {
          isFetchingRef.current = false;
        });
      }
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage, data?.pages.length]);

  // Load all tags for displaying selected tags
  useEffect(() => {
    if (allTags.length === 0) {
      getAllTags(locale).then(tags => {
        setAllTags(tags);
      }).catch(() => {
        // Ignore errors
      });
    }
  }, [allTags.length, locale]);

  // Handle search from modal
  const handleSearch = (tagIds: number[]) => {
    const params = new URLSearchParams(searchParams);
    
    if (tagIds.length > 0) {
      params.set("tagIds", tagIds.join(','));
    } else {
      params.delete("tagIds");
    }
    
    const queryString = params.toString();
    const path = queryString ? `/?${queryString}` : '/';
    router.replace(path, { scroll: false });
  };

  const handleRemoveTag = (tagId: number) => {
    const params = new URLSearchParams(searchParams);
    const currentTagIds = selectedTagIds.filter(id => id !== tagId);
    
    if (currentTagIds.length > 0) {
      params.set("tagIds", currentTagIds.join(','));
    } else {
      params.delete("tagIds");
    }
    
    const queryString = params.toString();
    const path = queryString ? `/?${queryString}` : '/';
    router.replace(path, { scroll: false });
  };

  const handleClearAllTags = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("tagIds");
    const path = params.toString() ? `/?${params.toString()}` : '/';
    router.replace(path, { scroll: false });
  };

  return (
    <Page className="pb-12">
      <Navbar
        subnavbar={
          <div className="relative w-full">
            {/* Search input that opens modal */}
            <div 
              className="search-input-container flex items-center gap-1.5 px-3 py-2 rounded-lg min-h-[44px] transition-colors bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setIsSearchModalOpen(true)}
              style={{ 
                backdropFilter: 'none',
                WebkitBackdropFilter: 'none',
                filter: 'none',
                WebkitFilter: 'none',
                textRendering: 'optimizeLegibility',
                WebkitFontSmoothing: 'antialiased',
                MozOsxFontSmoothing: 'grayscale',
                transform: 'translateZ(0)',
                willChange: 'auto',
                overflowX: 'auto',
                overflowY: 'hidden',
                WebkitOverflowScrolling: 'touch'
              }}
            >
              {/* Selected tags inside input - horizontal scrollable */}
              {selectedTagIds.length > 0 && (
                <div className="flex items-center gap-1.5 flex-shrink-0" style={{ minWidth: 'fit-content' }}>
                  {selectedTagIds.map(tagId => {
                    const tag = allTags.find(t => t.id === tagId);
                    if (!tag) return null;
                    return (
                      <div
                        key={tagId}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary text-white border border-primary/30 flex-shrink-0 shadow-sm whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          backdropFilter: 'none',
                          WebkitBackdropFilter: 'none',
                          filter: 'none',
                          WebkitFilter: 'none',
                          textRendering: 'optimizeLegibility',
                          WebkitFontSmoothing: 'antialiased',
                          MozOsxFontSmoothing: 'grayscale'
                        }}
                      >
                        <span className="whitespace-nowrap">{tag.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveTag(tagId);
                          }}
                          className="ml-0.5 hover:bg-white/30 rounded-full p-0.5 transition-colors flex-shrink-0 flex items-center justify-center"
                          aria-label="Remove tag"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {/* Search icon and placeholder */}
              {selectedTagIds.length === 0 && (
                <>
                  <Search className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <span className="flex-1 text-base text-gray-500 dark:text-gray-400">
                    Search tags...
                  </span>
                </>
              )}
              {/* Clear button - show when tags are selected */}
              {selectedTagIds.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAllTags();
                  }}
                  className="ml-auto flex-shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center"
                  aria-label="Clear all tags"
                >
                  <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                </button>
              )}
            </div>
          </div>
        }
      />

      {/* Search Modal */}
      <SearchModal
        open={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
        onSearch={handleSearch}
        selectedTagIds={selectedTagIds}
      />

      {/* Feed */}
      <div className="p-2">
        {status === "pending" ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: itemsPerLoad }).map((_, index) => (
              <div
                key={`shimmer-${index}`}
                className="mb-2 rounded-xl overflow-hidden aspect-[4/5] shimmer"
                style={{
                  animationDelay: `${index * 100}ms`,
                }}
              />
            ))}
          </div>
        ) : status === "error" ? (
          <div className="text-center py-10 text-red-500">
            Error loading feed
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {data?.pages.flatMap((page, i) => 
              page.data.map((post, postIndex) => {
                // Add priority to first 4 images on first page (above the fold)
                const isPriority = i === 0 && postIndex < 4;
                // Add animation class for new pages (not first page)
                const isNewPage = i > 0;
                // Staggered animation: items appear with slight delay
                // Left column items (even index): 0ms, 200ms, 400ms...
                // Right column items (odd index): 100ms, 300ms, 500ms...
                const columnIndex = postIndex % 2; // 0 for left, 1 for right
                const rowIndex = Math.floor(postIndex / 2);
                const animationDelay = isNewPage ? (rowIndex * 200 + columnIndex * 100) : 0;
                // Unique key combining page index and post id to avoid duplicates
                const uniqueKey = `${i}-${post.id}-${postIndex}`;
                return (
                  <Link 
                    key={uniqueKey} 
                    href={`/post/${post.id}`} 
                    prefetch={true}
                    className={`block mb-2 group relative ${isNewPage ? 'fade-in-up' : ''} smooth-load-item`}
                    onMouseEnter={() => router.prefetch(`/post/${post.id}`)}
                    style={isNewPage ? { 
                      animationDelay: `${animationDelay}ms`,
                      animationFillMode: 'both'
                    } : undefined}
                  >
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[4/5] image-load-wrapper" style={{
                      filter: 'none',
                      WebkitFilter: 'none',
                      backdropFilter: 'none',
                      WebkitBackdropFilter: 'none'
                    }}>
                      <Image
                        src={post.imageUrl}
                        alt={post.description || "Nail Art"}
                        fill
                        className="object-cover transition-all duration-700 ease-out group-hover:scale-105 image-fade-in"
                        sizes="(max-width: 768px) 50vw, 33vw"
                        priority={isPriority}
                        loading={isPriority ? undefined : "lazy"}
                        onLoad={(e) => {
                          // Smooth fade-in when image loads
                          const target = e.currentTarget;
                          target.style.opacity = '1';
                        }}
                        style={{ 
                          opacity: isPriority ? 1 : 0,
                          transition: 'opacity 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
                          filter: 'none',
                          WebkitFilter: 'none',
                          imageRendering: 'auto'
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white transition-opacity duration-500">
                        <p className="text-xs font-medium truncate">{post.author?.businessName}</p>
                        {post.price && <p className="text-[10px] opacity-90">{post.price} {post.currency}</p>}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Loading More - Smooth loading indicator */}
      <div 
        ref={ref} 
        className="py-6 text-center text-sm text-gray-500 transition-opacity duration-300"
        style={{ minHeight: '60px' }}
      >
        {isFetchingNextPage ? (
          <div className="flex items-center justify-center gap-2 animate-fade-in">
            <div className="loading-spinner"></div>
            <span className="animate-pulse">Loading more...</span>
          </div>
        ) : hasNextPage ? (
          <span className="opacity-60">Scroll for more</span>
        ) : (
          <span className="opacity-40">You've seen it all!</span>
        )}
      </div>

      {/* Performance Monitor - скрыт, можно включить через ?perf=true */}
      {/* <PerformanceMonitor
        itemCount={data?.pages.flatMap(page => page.data).length || 0}
        pageCount={data?.pages.length || 0}
      /> */}
    </Page>
  );
}