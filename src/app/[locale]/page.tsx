"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeedPosts } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Page, Navbar, Searchbar, Block, Chip, Sheet, List, ListItem } from "konsta/react";
import { useSearchParams, useRouter } from "next/navigation";
import { useDebounce } from "@/hooks/use-debounce";
import { searchTags, getTagById } from "@/app/actions";

export default function Home() {
  const { ref, inView } = useInView();
  const searchParams = useSearchParams();
  const router = useRouter();

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
    queryKey: ["feed", selectedTagId], // Refetch when tag changes
    queryFn: ({ pageParam }) => getFeedPosts({ pageParam, tagId: selectedTagId ? parseInt(selectedTagId) : undefined }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage]);

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
    <Page>
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
        <div className="p-4 border-b">
          <Searchbar
            value={searchQuery}
            onInput={(e: any) => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            clearButton
            onClear={() => setSearchQuery("")}
            disableButton={false}
          />
        </div>
        <div className="overflow-y-auto h-[90vh]">
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
      <div className="p-2 columns-2 gap-2 space-y-2 pb-20">
        {status === "pending" ? (
          <div className="col-span-2 text-center py-10">Loading...</div>
        ) : status === "error" ? (
          <div className="col-span-2 text-center py-10 text-red-500">
            Error loading feed
          </div>
        ) : (
          data?.pages.map((page, i) => (
            <div key={i} className="contents">
              {page.data.map((post) => (
                <Link key={post.id} href={`/post/${post.id}`} className="block break-inside-avoid mb-2 group relative">
                  <div className="relative rounded-xl overflow-hidden bg-gray-100 aspect-[4/5]">
                    <Image
                      src={post.imageUrl}
                      alt={post.description || "Nail Art"}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent text-white">
                      <p className="text-xs font-medium truncate">{post.author?.businessName}</p>
                      {post.price && <p className="text-[10px] opacity-90">{post.price} {post.currency}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Loading More */}
      <div ref={ref} className="py-8 text-center text-sm text-gray-500">
        {isFetchingNextPage
          ? "Loading more..."
          : hasNextPage
            ? "Load more"
            : "You've seen it all!"}
      </div>
    </Page>
  );
}
