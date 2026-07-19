"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Page, Chip } from "konsta/react";
import MasterMatchDialog from "@/components/MasterMatchDialog";
import dynamic from "next/dynamic";
import { usePostSource } from "@/hooks/use-post-source";
import PostDetailPortfolioPanel from "@/components/PostDetailPortfolioPanel";
import PostDetailSimilarWorks from "@/components/PostDetailSimilarWorks";

const BookingModal = dynamic(() => import("@/components/BookingModal"), { ssr: false });
import { deletePost } from "@/app/actions";

interface PostTag {
  tag: {
    id: number;
    slug: string;
    nameTranslations: unknown;
  };
}

interface PostDetailPost {
  id: string;
  imageUrl: string;
  blurDataUrl: string | null;
  description: string | null;
  price: number | null;
  currency: string | null;
  durationMinutes: number | null;
  masterId: string | null;
  tags: PostTag[];
  author: {
    userId: string;
    businessName: string;
    avatarUrl: string | null;
    phoneNumber: string;
    phoneCountryCode: string | null;
  } | null;
}

interface PostDetailClientProps {
  post: PostDetailPost;
  matchingMasters: Match[];
  source?: string;
}

interface Match {
  masterId: string;
  businessName: string;
  phoneNumber: string;
  phoneCountryCode: string | null;
  avatarUrl?: string | null;
  score: number;
  matchingImageUrl: string | null;
  matchingPostId: string | null;
  price: number | null;
  currency: string | null;
  durationMinutes: number | null;
}

export default function PostDetailClient({ post, matchingMasters, source }: PostDetailClientProps) {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const locale = (params?.locale as string) || 'en';

  // Check if current user is the owner of the post
  // post.masterId references masterProfiles.userId, and author is the masterProfile relation
  // So we need to check: session.user.id === post.masterId OR session.user.id === post.author?.userId
  const isOwner = Boolean(
    session?.user?.id &&
    (session.user.id === post.masterId || session.user.id === post.author?.userId)
  );

  const [isDeleting, setIsDeleting] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deletePost(post.id);
      // If deletePost returns successfully, redirect to profile
      if (result?.success) {
        router.push(`/${locale}/profile`);
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete post:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete post. Please try again.';
      alert(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);

  const {
    sourceFromUrl,
    sourceFromWindow,
    sourceFromReferrer,
    effectiveSource,
    isPortfolioMode,
    finalIsPortfolioMode,
  } = usePostSource(source);

  // Debug logging (remove in production)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      console.log('PostDetailClient - source prop:', source);
      console.log('PostDetailClient - source from URL (useSearchParams):', sourceFromUrl);
      console.log('PostDetailClient - source from window.location:', sourceFromWindow);
      console.log('PostDetailClient - source from referrer:', sourceFromReferrer);
      console.log('PostDetailClient - effective source:', effectiveSource);
      console.log('PostDetailClient - isPortfolioMode:', isPortfolioMode);
      console.log('PostDetailClient - finalIsPortfolioMode:', finalIsPortfolioMode);
      console.log('PostDetailClient - full URL:', window.location.href);
      console.log('PostDetailClient - referrer:', document.referrer);
      console.log('PostDetailClient - sessionStorage postSource:', sessionStorage.getItem('postSource'));
      console.log('PostDetailClient - isOwner:', isOwner);
      console.log('PostDetailClient - session user id:', session?.user?.id);
      console.log('PostDetailClient - post author userId:', post.author?.userId);
      console.log('PostDetailClient - post masterId:', post.masterId);
      console.log('PostDetailClient - post object:', { masterId: post.masterId, author: post.author });
    }
  }, [source, sourceFromUrl, sourceFromWindow, sourceFromReferrer, effectiveSource, isPortfolioMode, finalIsPortfolioMode, isOwner, session, post]);



  return (
    <Page className="!h-[100dvh] !overflow-hidden flex flex-col">
      {/* Main Content Area - Flex Column */}
      <div className="flex-1 flex flex-col min-h-0 relative">

        {/* Image Container - Takes available space */}
        <div className="flex-1 relative bg-black min-h-0" style={{
          filter: 'none',
          WebkitFilter: 'none',
          backdropFilter: 'none',
          WebkitBackdropFilter: 'none'
        }}>
          <Image
            src={post.imageUrl}
            alt={post.description || "Nail Art"}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            placeholder={post.blurDataUrl ? "blur" : undefined}
            blurDataURL={post.blurDataUrl ?? undefined}
            style={{
              filter: 'none',
              WebkitFilter: 'none',
              imageRendering: 'auto'
            }}
          />

          {/* Tags Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(({ tag }: PostTag) => (
                <Chip
                  key={tag.id}
                  className="bg-white/20 backdrop-blur-sm text-white border-none"
                >
                  {typeof tag.nameTranslations === 'object' && tag.nameTranslations !== null
                    ? (tag.nameTranslations as { en?: string }).en || tag.slug
                    : tag.slug}
                </Chip>
              ))}
            </div>
          </div>
        </div>

        {/* Similar Works Section - Fixed at bottom */}
        {/* Bottom Section: Context Aware */}
        <div className="bg-white border-t border-gray-100 flex-shrink-0 pb-24 pt-2">
          {finalIsPortfolioMode ? (
            <PostDetailPortfolioPanel
              price={post.price}
              currency={post.currency}
              durationMinutes={post.durationMinutes}
              description={post.description}
              isOwner={isOwner}
              isDeleting={isDeleting}
              onEdit={() => router.push(`/${locale}/post/${post.id}/update`)}
              onDelete={handleDelete}
              canBook={Boolean(
                (!session?.user || session.user.role === "client") &&
                post.masterId &&
                post.durationMinutes
              )}
              onBook={() => setBookingOpen(true)}
            />
          ) : null}

          <PostDetailSimilarWorks
            matchingMasters={matchingMasters}
            finalIsPortfolioMode={finalIsPortfolioMode}
            isPortfolioMode={isPortfolioMode}
            onMatchClick={handleMatchClick}
          />
        </div>
      </div>

      {selectedMatch && (
        <MasterMatchDialog
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          master={selectedMatch}
        />
      )}

      {bookingOpen && post.masterId && (
        <BookingModal
          open={bookingOpen}
          onOpenChange={setBookingOpen}
          masterId={post.masterId}
          postId={post.id}
          masterName={post.author?.businessName ?? "Master"}
          masterAvatarUrl={post.author?.avatarUrl}
          price={post.price}
          currency={post.currency}
          durationMinutes={post.durationMinutes}
        />
      )}
    </Page>
  );
}
