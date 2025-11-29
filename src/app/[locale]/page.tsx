"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { getFeedPosts } from "@/app/actions";
import { useInView } from "react-intersection-observer";
import { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { MapPin, Search, Heart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const { ref, inView } = useInView();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => getFeedPosts({ pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextPage,
  });

  useEffect(() => {
    if (inView && hasNextPage) {
      fetchNextPage();
    }
  }, [inView, fetchNextPage, hasNextPage]);

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b p-4 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 bg-muted px-3 py-1.5 rounded-full text-sm font-medium">
            <MapPin className="w-4 h-4 text-primary" />
            <span>New York</span>
          </div>
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="pl-9 h-9 bg-muted/50 border-none"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {["Trending", "New", "French", "Art", "Minimal", "3D"].map((filter) => (
            <Badge
              key={filter}
              variant="secondary"
              className="whitespace-nowrap px-4 py-1.5 rounded-full cursor-pointer hover:bg-primary/10"
            >
              {filter}
            </Badge>
          ))}
        </div>
      </header>

      {/* Feed */}
      <div className="p-2 columns-2 gap-2 space-y-2">
        {status === "pending" ? (
          <div className="col-span-2 text-center py-10">Loading...</div>
        ) : status === "error" ? (
          <div className="col-span-2 text-center py-10 text-destructive">
            Error loading feed
          </div>
        ) : (
          data?.pages.map((page, i) => (
            <div key={i} className="contents">
              {page.data.map((post) => (
                <Link key={post.id} href={`/post/${post.id}`} className="block break-inside-avoid mb-2 group relative">
                  <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/5]">
                    <Image
                      src={post.imageUrl}
                      alt={post.description || "Nail Art"}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 33vw"
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full bg-white/80 backdrop-blur-sm">
                            <Heart className="h-4 w-4" />
                        </Button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-xs font-medium truncate">{post.master?.businessName}</p>
                        {post.price && <p className="text-xs opacity-90">{post.price} {post.currency}</p>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Loading More */}
      <div ref={ref} className="py-8 text-center text-sm text-muted-foreground">
        {isFetchingNextPage
          ? "Loading more..."
          : hasNextPage
          ? "Load more"
          : "You've seen it all!"}
      </div>
    </div>
  );
}
