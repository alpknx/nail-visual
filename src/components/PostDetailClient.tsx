"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Page, Navbar, NavbarBackLink, Block, Chip, Button } from "konsta/react";
import MatchingMastersList from "@/components/MatchingMastersList";
import MasterMatchDialog from "@/components/MasterMatchDialog";
import { MessageCircle, Clock, Phone } from "lucide-react";
import ContactButtons from "@/components/ContactButtons";

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
  price: number | null;
}

export default function PostDetailClient({ post, matchingMasters, source }: PostDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

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
    }
  }, [source, sourceFromUrl, sourceFromWindow, sourceFromReferrer, effectiveSource, isPortfolioMode, finalIsPortfolioMode]);



  return (
    <Page className="!h-[100dvh] !overflow-hidden flex flex-col">
      <Navbar
        className="absolute top-0 left-0 z-20 text-white"
        left={<NavbarBackLink onClick={() => router.back()} text="Back" className="text-white" />}
      />

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
                <div>
                  <div className="text-2xl font-bold text-gray-900">
                    {post.price ? `${post.price} ${post.currency}` : 'Price on request'}
                  </div>
                  {post.durationMinutes && (
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <Clock className="w-4 h-4 mr-1" />
                      {post.durationMinutes} mins
                    </div>
                  )}
                </div>
              </div>

              {post.description && (
                <div className="text-sm text-gray-700">
                  {post.description}
                </div>
              )}

              <ContactButtons
                phoneNumber={post.author.phoneNumber}
                phoneCountryCode={post.author.phoneCountryCode}
              />
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

      {/* Master Match Dialog - Rendered at top level for proper z-index */}
      {selectedMatch && (
        <MasterMatchDialog
          open={!!selectedMatch}
          onOpenChange={(open) => !open && setSelectedMatch(null)}
          master={selectedMatch}
        />
      )}
    </Page>
  );
}
