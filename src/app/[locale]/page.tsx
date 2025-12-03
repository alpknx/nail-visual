"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeedPosts } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { useEffect, useState, useRef, useMemo, useCallback, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Page, Navbar, Searchbar, List, ListItem } from "konsta/react";
import { useSearchParams, useParams } from "next/navigation";
import { useRouter } from "@/i18n/routing";
import { useDebounce } from "@/hooks/use-debounce";
import { searchTags, getTagById, getAllTags } from "@/app/actions";
import PerformanceMonitor from "@/components/PerformanceMonitor";

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

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [isLoadingAllTags, setIsLoadingAllTags] = useState(false);
  const hideDropdownTimerRef = useRef<NodeJS.Timeout | null>(null);

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

  // Store current searchQuery in ref to avoid dependency issues
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Clear search query when tags are selected - tags are shown as chips, not in input
  useEffect(() => {
    if (selectedTagIds.length > 0 && searchQueryRef.current !== "") {
      // Clear search query when tags are selected - they're displayed as chips
      startTransition(() => {
        setSearchQuery("");
      });
    }
  }, [selectedTagIds]);

  // Load all tags when search is focused
  useEffect(() => {
    if (isSearchFocused && allTags.length === 0 && !isLoadingAllTags) {
      setIsLoadingAllTags(true);
      getAllTags(locale).then(tags => {
        setAllTags(tags);
        setIsLoadingAllTags(false);
      }).catch(() => {
        setIsLoadingAllTags(false);
      });
    }
  }, [isSearchFocused, allTags.length, locale, isLoadingAllTags]);

  // Search effect with abort controller to cancel previous requests
  useEffect(() => {
    const abortController = new AbortController();
    
    const performSearch = async () => {
      if (debouncedQuery.length >= 2) {
        setIsLoading(true);
        try {
          const results = await searchTags(debouncedQuery);
          // Only update if request wasn't aborted
          if (!abortController.signal.aborted) {
            setSearchResults(results);
            setIsLoading(false);
          }
        } catch (error) {
          if (!abortController.signal.aborted) {
            console.error("Failed to search tags:", error);
            setSearchResults([]);
            setIsLoading(false);
          }
        }
      } else {
        setSearchResults([]);
        setIsLoading(false);
      }
    };
    
    performSearch();
    
    // Cleanup: abort request if component unmounts or query changes
    return () => {
      abortController.abort();
    };
  }, [debouncedQuery]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        // Clear timer if clicking outside
        if (hideDropdownTimerRef.current) {
          clearTimeout(hideDropdownTimerRef.current);
          hideDropdownTimerRef.current = null;
        }
        setIsSearchFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  // Hide dropdown on scroll if input is empty
  useEffect(() => {
    let lastScrollY = window.scrollY;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.scrollY;
          // Only hide if scrolling down and input is empty
          if (currentScrollY > lastScrollY && searchQuery.trim() === "" && isSearchFocused) {
            // Clear timer if scrolling
            if (hideDropdownTimerRef.current) {
              clearTimeout(hideDropdownTimerRef.current);
              hideDropdownTimerRef.current = null;
            }
            startTransition(() => {
              setIsSearchFocused(false);
            });
          }
          lastScrollY = currentScrollY;
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [searchQuery, isSearchFocused]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hideDropdownTimerRef.current) {
        clearTimeout(hideDropdownTimerRef.current);
      }
    };
  }, []);

  const handleTagToggle = useCallback((tag: any) => {
    const params = new URLSearchParams(searchParams);
    const currentTagIds = [...selectedTagIds];
    const tagIndex = currentTagIds.indexOf(tag.id);
    const wasRemoving = tagIndex > -1;
    
    // Clear any existing timer
    if (hideDropdownTimerRef.current) {
      clearTimeout(hideDropdownTimerRef.current);
      hideDropdownTimerRef.current = null;
    }
    
    if (tagIndex > -1) {
      // Remove tag if already selected
      currentTagIds.splice(tagIndex, 1);
    } else {
      // Add tag if not selected
      currentTagIds.push(tag.id);
    }
    
    if (currentTagIds.length > 0) {
      params.set("tagIds", currentTagIds.join(','));
    } else {
      params.delete("tagIds");
    }
    
    // Clear search query when tags are selected - they're displayed as chips, not in input
    startTransition(() => {
      setSearchQuery("");
    });
    
    // Use replace instead of push to avoid adding to history and reduce POST requests
    // Router from @/i18n/routing automatically handles locale prefix for paths starting with /
    const queryString = params.toString();
    const path = queryString ? `/?${queryString}` : '/';
    router.replace(path, { scroll: false });
    
    // If tag was added (not removed), set timer to hide dropdown after 1.5 seconds
    if (!wasRemoving) {
      hideDropdownTimerRef.current = setTimeout(() => {
        startTransition(() => {
          setIsSearchFocused(false);
        });
        hideDropdownTimerRef.current = null;
      }, 1500);
    }
  }, [searchParams, router, selectedTagIds]);

  const handleClearTags = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("tagIds");
    startTransition(() => {
      setSearchQuery("");
      setSearchResults([]);
      setIsSearchFocused(false);
    });
    // Use replace instead of push to avoid adding to history and reduce POST requests
    // Router from @/i18n/routing automatically handles locale prefix for paths starting with /
    const queryString = params.toString();
    const path = queryString ? `/?${queryString}` : '/';
    router.replace(path, { scroll: false });
  }, [searchParams, router]);

  const handleRemoveTag = useCallback((tagId: number) => {
    const params = new URLSearchParams(searchParams);
    const currentTagIds = selectedTagIds.filter(id => id !== tagId);
    
    if (currentTagIds.length > 0) {
      params.set("tagIds", currentTagIds.join(','));
    } else {
      params.delete("tagIds");
    }
    
    // Keep search query empty - tags are displayed as chips, not in input
    startTransition(() => {
      setSearchQuery("");
    });
    
    // Use replace instead of push to avoid adding to history and reduce POST requests
    // Router from @/i18n/routing automatically handles locale prefix for paths starting with /
    const queryString = params.toString();
    const path = queryString ? `/?${queryString}` : '/';
    router.replace(path, { scroll: false });
  }, [searchParams, router, selectedTagIds]);

  const showDropdown = useMemo(() => {
    return isSearchFocused && (searchQuery.length >= 2 || searchResults.length > 0 || isLoading || allTags.length > 0);
  }, [isSearchFocused, searchQuery.length, searchResults.length, isLoading, allTags.length]);

  // Filter tags based on search query - exclude already selected tags
  const displayedTags = useMemo(() => {
    let tags = [];
    if (searchQuery.length >= 2) {
      tags = searchResults;
    } else {
      tags = allTags;
    }
    // Filter out already selected tags to avoid duplication
    return tags.filter(tag => !selectedTagIds.includes(tag.id));
  }, [searchQuery, searchResults, allTags, selectedTagIds]);

  return (
    <Page className="pb-12">
      <div ref={searchContainerRef} className="relative">
        <Navbar
          subnavbar={
            <div className="relative w-full search-input-container" style={{
              backdropFilter: 'none',
              WebkitBackdropFilter: 'none',
              filter: 'none',
              WebkitFilter: 'none'
            }}>
              {/* Custom search input with tags inside */}
              <div 
                className={`search-input-container flex items-center gap-1.5 px-3 py-2 rounded-lg min-h-[44px] transition-colors ${
                  isSearchFocused 
                    ? 'bg-white dark:bg-gray-900 border-2 border-primary shadow-sm' 
                    : 'bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                }`}
                onClick={() => setIsSearchFocused(true)}
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
                {/* Search input */}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e: any) => {
                    const value = e.target.value;
                    // Normalize value: if it's empty or only whitespace, use empty string
                    const normalizedValue = value.trim() === "" ? "" : value;
                    
                    // Only update search query state - don't trigger URL updates
                    // URL should only update when tags are actually selected/removed, not during typing
                    startTransition(() => {
                      setSearchQuery(normalizedValue);
                      setIsSearchFocused(true);
                    });
                    // Note: We don't auto-select tags when typing - user must click on them
                    // This keeps the input clean and only shows selected tags as chips
                  }}
                  onFocus={() => setIsSearchFocused(true)}
                  placeholder={selectedTagIds.length > 0 ? "" : "Search tags..."}
                  className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-base text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-0 flex-shrink-0"
                  style={{ fontSize: '16px' }}
                />
                {/* Clear button */}
                {(searchQuery || selectedTagIds.length > 0) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startTransition(() => {
                        setSearchQuery("");
                      });
                      handleClearTags();
                    }}
                    className="flex-shrink-0 p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors flex items-center justify-center"
                    aria-label="Clear"
                  >
                    <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          }
        />

        {/* Search Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
            {isLoading || isLoadingAllTags ? (
              <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400">
                Loading...
              </div>
            ) : displayedTags.length > 0 ? (
              <div className="p-1.5">
                <div 
                  className="tag-scroll-container" 
                  style={{ 
                    maxHeight: '60px',
                    overflowX: 'auto',
                    overflowY: 'hidden',
                    WebkitOverflowScrolling: 'touch',
                    display: 'grid',
                    gridTemplateRows: 'repeat(2, 1fr)',
                    gridAutoFlow: 'column',
                    gap: '6px'
                  }}
                >
                  {displayedTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag)}
                      className="px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/10 whitespace-nowrap"
                      style={{ height: 'fit-content' }}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
            ) : searchQuery.length >= 2 && debouncedQuery.length >= 2 ? (
              <div className="p-2 text-center text-xs text-gray-500 dark:text-gray-400">
                No matches
              </div>
            ) : null}
          </div>
        )}
      </div>

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