"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Page, Block, Chip, Button } from "konsta/react";
import MatchingMastersList from "@/components/MatchingMastersList";
import MasterMatchDialog from "@/components/MasterMatchDialog";
import { MessageCircle, Clock, Phone, Edit, Trash2 } from "lucide-react";
import ContactButtons from "@/components/ContactButtons";
import BookingModal from "@/components/BookingModal";
import Link from "next/link";
import { deletePost } from "@/app/actions";

interface PostDetailClientProps {
  post: any;
  matchingMasters: any[];
  source?: string;
}

interface Match {
  masterId: string;
  businessName: string;
  phoneNumber: string;
  phoneCountryCode: string | null;
  avatarUrl?: string | null;
  score: number;
  distance: number;
  matchingImageUrl: string | null;
  matchingPostId: string | null;
  price: number | null;
  currency: string | null;
  durationMinutes: number | null;
}

export default function PostDetailClient({ post, matchingMasters, source }: PostDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
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
    } catch (error: any) {
      console.error('Failed to delete post:', error);
      const errorMessage = error?.message || 'Failed to delete post. Please try again.';
      alert(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleMatchClick = useCallback((match: Match) => {
    setSelectedMatch(match);
  }, []);
  
  // Check source from multiple sources for maximum reliability
  const sourceFromUrl = searchParams.get('source');
  const sourceFromWindow = typeof window !== 'undefined' 
    ? new URLSearchParams(window.location.search).get('source')
    : null;
  
  // Also check referrer and sessionStorage to detect if coming from master profile page (synchronous check)
  const checkSourceFromReferrer = () => {
    if (typeof window === 'undefined') return null;
    
    // First check sessionStorage (most reliable for mobile Safari)
    try {
      const storedSource = sessionStorage.getItem('postSource');
      if (storedSource === 'profile') {
        return 'profile';
      }
    } catch (e) {
      // sessionStorage might not be available
    }
    
    // Also check if referrer contains master profile path
    try {
      const referrer = document.referrer;
      if (referrer && (referrer.includes('/master/') || referrer.includes('/profile'))) {
        return 'profile';
      }
    } catch (e) {
      // referrer might not be available
    }
    
    return null;
  };
  
  const sourceFromReferrer = checkSourceFromReferrer();
  const effectiveSource = source || sourceFromUrl || sourceFromWindow || sourceFromReferrer;
  const isPortfolioMode = Boolean(effectiveSource === 'profile');
  
  // Force portfolio mode if we have the flag - this is critical for mobile Safari
  // Double-check sessionStorage directly as a fallback (synchronous check)
  // Also check URL path to see if we're coming from master page
  // This MUST be synchronous and happen during render, not in useEffect
  const finalIsPortfolioMode = (() => {
    // First check if we already determined portfolio mode
    if (isPortfolioMode) return true;
    
    // On server, return false (will be checked on client)
    if (typeof window === 'undefined') return false;
    
    try {
      // Check sessionStorage FIRST (most reliable for mobile Safari)
      const storedSource = sessionStorage.getItem('postSource');
      if (storedSource === 'profile') {
        return true;
      }
      
      // Also check referrer more aggressively
      const referrer = document.referrer || '';
      if (referrer.includes('/master/') || referrer.includes('/profile')) {
        return true;
      }
      
      return false;
    } catch (e) {
      // If sessionStorage is not available, fall back to referrer check
      try {
        const referrer = document.referrer || '';
        return referrer.includes('/master/') || referrer.includes('/profile');
      } catch {
        return false;
      }
    }
  })();
  
  // Clear sessionStorage after reading to avoid stale data
  useEffect(() => {
    if (typeof window !== 'undefined' && sourceFromReferrer === 'profile') {
      // Don't clear immediately - keep it for potential back navigation
      // sessionStorage.removeItem('postSource');
    }
  }, [sourceFromReferrer]);
  
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
            className="object-cover"
            priority
            style={{
              filter: 'none',
              WebkitFilter: 'none',
              imageRendering: 'auto'
            }}
          />

          {/* Tags Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-10">
            <div className="flex flex-wrap gap-2">
              {post.tags.map(({ tag }: any) => (
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
            <Block className="!my-0 !py-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-bold text-gray-900 whitespace-nowrap">
                    {post.price ? `${post.price} ${post.currency}` : 'Price on request'}
                  </div>
                  {post.durationMinutes && (
                    <div className="flex items-center text-base text-gray-600 whitespace-nowrap">
                      <Clock className="w-4 h-4 mr-1.5" />
                      <span>{post.durationMinutes} mins</span>
                    </div>
                  )}
                </div>
                {isOwner && (
                  <Button
                    clear
                    className="!p-2"
                    onClick={(e) => {
                      e.preventDefault();
                      router.push(`/${locale}/post/${post.id}/update`);
                    }}
                  >
                    <Edit className="w-5 h-5" />
                  </Button>
                )}
              </div>

              {post.description && (
                <div className="text-sm text-gray-700">
                  {post.description}
                </div>
              )}

              {isOwner ? (
                <div className="flex gap-2">
                  <Button 
                    large 
                    className="flex-1"
                    onClick={() => router.push(`/${locale}/post/${post.id}/update`)}
                    disabled={isDeleting}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Post
                  </Button>
                  <Button 
                    large 
                    className="flex-1 bg-red-500 active:bg-red-600"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {session?.user?.role === "client" && post.masterId && post.durationMinutes && (
                    <Button large className="w-full" onClick={() => setBookingOpen(true)}>
                      Book Appointment
                    </Button>
                  )}
                  <ContactButtons
                    phoneNumber={post.author.phoneNumber}
                    phoneCountryCode={post.author.phoneCountryCode}
                  />
                </div>
              )}
            </Block>
          ) : null}
          
          {/* Only show "Similar Works Nearby" if NOT in portfolio mode AND we have matching masters */}
          {/* CRITICAL: Double-check finalIsPortfolioMode to prevent showing on mobile Safari */}
          {(() => {
            // Extra safety check for mobile Safari - check sessionStorage directly during render
            let shouldHideSimilarWorks = false;
            if (typeof window !== 'undefined') {
              try {
                const stored = sessionStorage.getItem('postSource');
                if (stored === 'profile') {
                  shouldHideSimilarWorks = true;
                }
              } catch (e) {
                // ignore
              }
            }
            // Never show if we're in portfolio mode OR if sessionStorage says profile
            return !shouldHideSimilarWorks && !finalIsPortfolioMode && !isPortfolioMode && matchingMasters && matchingMasters.length > 0;
          })() && (
            <>
              <Block className="!my-0 !py-2">
                <h2 className="text-sm font-semibold text-gray-900">Similar Works Nearby</h2>
              </Block>

              {/* Horizontal Scroll for Matching Masters */}
              <div className="overflow-x-auto px-4 no-scrollbar flex gap-3">
                <MatchingMastersList matches={matchingMasters} onMatchClick={handleMatchClick} />
              </div>
            </>
          )}
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
