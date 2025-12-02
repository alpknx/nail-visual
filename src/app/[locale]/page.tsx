"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeedPosts } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { useEffect, useState, useRef, useMemo, useCallback, startTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Page, Navbar, Searchbar, List, ListItem } from "konsta/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { searchTags, getTagById } from "@/app/actions";
import PerformanceMonitor from "@/components/PerformanceMonitor";

export default function Home() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
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
  });

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Tag filter state from URL
  const selectedTagId = searchParams.get("tagId");

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["feed", selectedTagId, itemsPerLoad], // Refetch when tag or itemsPerLoad changes
    queryFn: ({ pageParam }) => getFeedPosts({ 
      pageParam, 
      tagId: selectedTagId ? parseInt(selectedTagId) : undefined,
      limit: itemsPerLoad 
    }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  // Immediate loading when in view
  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage, isFetchingNextPage]);

  // Store current searchQuery in ref to avoid dependency issues
  const searchQueryRef = useRef(searchQuery);
  useEffect(() => {
    searchQueryRef.current = searchQuery;
  }, [searchQuery]);

  // Fetch tag name if tagId is present - only update if different
  useEffect(() => {
    const fetchTagName = async () => {
      if (selectedTagId) {
        const tag = await getTagById(parseInt(selectedTagId));
        if (tag && tag.name !== searchQueryRef.current) {
          // Only update if the name is different to avoid unnecessary re-renders
          startTransition(() => {
            setSearchQuery(tag.name);
          });
        }
      } else if (searchQueryRef.current !== "") {
        // Only clear if not already empty
        startTransition(() => {
          setSearchQuery("");
        });
      }
    };
    fetchTagName();
  }, [selectedTagId]);

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

  const handleTagSelect = useCallback((tag: any) => {
    const params = new URLSearchParams(searchParams);
    if (tag) {
      params.set("tagId", tag.id.toString());
      // Optimistically update searchQuery if tag name is known
      // This prevents flickering - the value stays visible immediately
      if (tag.name && tag.name !== searchQueryRef.current) {
        startTransition(() => {
          setSearchQuery(tag.name);
        });
      }
      startTransition(() => {
        setSearchResults([]);
        setIsSearchFocused(false);
      });
    } else {
      params.delete("tagId");
      startTransition(() => {
        setSearchQuery("");
        setSearchResults([]);
        setIsSearchFocused(false);
      });
    }
    router.push(`/?${params.toString()}`);
  }, [searchParams, router]);

  const showDropdown = useMemo(() => {
    return isSearchFocused && (searchQuery.length >= 2 || searchResults.length > 0 || isLoading);
  }, [isSearchFocused, searchQuery.length, searchResults.length, isLoading]);

  return (
    <Page className="pb-12">
      <div ref={searchContainerRef} className="relative">
        <Navbar
          subnavbar={
            <Searchbar
              value={searchQuery}
              onInput={useCallback((e: any) => {
                const value = e.target.value;
                startTransition(() => {
                  setSearchQuery(value);
                  setIsSearchFocused(true);
                });
              }, [])}
              placeholder="Search tags..."
              disableButton={false}
              onFocus={useCallback(() => setIsSearchFocused(true), [])}
              onClear={useCallback((e) => {
                startTransition(() => {
                  setSearchQuery("");
                });
                handleTagSelect(null);
              }, [handleTagSelect])}
              className="search-input-mobile"
            />
          }
        />

        {/* Search Dropdown */}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchResults.length > 0 ? (
              <List strong inset className="!m-0">
                {searchResults.map((tag) => (
                  <ListItem
                    key={tag.id}
                    title={tag.name}
                    onClick={() => handleTagSelect(tag)}
                    link
                    chevron={false}
                  />
                ))}
              </List>
            ) : searchQuery.length >= 2 && debouncedQuery.length >= 2 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
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
                    <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[4/5] image-load-wrapper">
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
                          transition: 'opacity 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
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
