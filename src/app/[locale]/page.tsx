"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeedPosts } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Page, Navbar, Searchbar, Block, Link as KonstaLink, Sheet, List, ListItem, Toolbar, ToolbarPane } from "konsta/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { searchTags, getTagById } from "@/app/actions";
import { X } from "lucide-react";

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
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<any[]>([]);

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

  // Fetch tag name if tagId is present
  useEffect(() => {
    const fetchTagName = async () => {
      if (selectedTagId) {
        const tag = await getTagById(parseInt(selectedTagId));
        if (tag) {
          setSearchQuery(tag.name);
        }
      } else {
        setSearchQuery("");
      }
    };
    fetchTagName();
  }, [selectedTagId]);

  // Search effect
  useEffect(() => {
    const performSearch = async () => {
      if (debouncedQuery.length >= 2) {
        const results = await searchTags(debouncedQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };
    performSearch();
  }, [debouncedQuery]);

  const handleTagSelect = (tag: any) => {
    const params = new URLSearchParams(searchParams);
    if (tag) {
      params.set("tagId", tag.id.toString());
    } else {
      params.delete("tagId");
    }
    router.push(`/?${params.toString()}`);

    setSearchQuery(""); // Clear search
    setSearchResults([]);
    setIsSheetOpen(false);
  };

  return (
    <Page className="pb-12">
      <Navbar
        subnavbar={
          <Searchbar
            value={searchQuery}
            onInput={() => setIsSheetOpen(true)}
            placeholder="Search tags..."
            disableButton={false} // Always show search
            onFocus={() => setIsSheetOpen(true)}
            onClear={(e) => {
              setSearchQuery("")
              handleTagSelect(null)
            }}
          />
        }
      />

      {/* Search Sheet */}
      <Sheet
        opened={isSheetOpen}
        backdrop={true}
        onBackdropClick={() => setIsSheetOpen(false)}
      >
        <Toolbar top className="ios:pt-4">
          <ToolbarPane>
            <Searchbar
              value={searchQuery}
              onInput={(e: any) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              clearButton
              onClear={() => setSearchQuery("")}
            />
          </ToolbarPane>
          <ToolbarPane>
            <KonstaLink onClick={() => setIsSheetOpen(false)}>
              <X />
            </KonstaLink>
          </ToolbarPane>
        </Toolbar>

        <div className="overflow-y-auto h-[85vh]">
          {searchResults.length > 0 ? (
            <List strong inset>
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
          ) : searchQuery.length > 0 && debouncedQuery.length >= 2 ? (
            <Block className="text-center text-gray-500 py-4">
              No tags found
            </Block>
          ) : (
            <Block className="text-center text-gray-500 py-4">
              Type to search tags...
            </Block>
          )}
        </div>
      </Sheet>

      {/* Feed */}
      <div className="p-2">
        {status === "pending" ? (
          <div className="text-center py-10">Loading...</div>
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
                        className="object-cover transition-all duration-500 ease-out group-hover:scale-105 image-fade-in"
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
                          transition: 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white transition-opacity duration-300">
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
    </Page>
  );
}
