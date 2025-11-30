"use client";

import React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Page, Navbar, NavbarBackLink, Block, Chip, Button } from "konsta/react";
import MatchingMastersList from "@/components/MatchingMastersList";
import { MessageCircle, Clock } from "lucide-react";

interface PostDetailClientProps {
  post: any;
  matchingMasters: any[];
  source?: string;
}

export default function PostDetailClient({ post, matchingMasters, source }: PostDetailClientProps) {
  const router = useRouter();
  const isPortfolioMode = source === 'profile';

  const handleBookClick = () => {
    if (!post.author?.phoneNumber) return;

    const message = `Hi ${post.author.businessName}, I saw your #${post.tags[0]?.tag?.slug || 'nail'} work (Image #${post.id}) and want to book...`;
    const whatsappUrl = `https://wa.me/${post.author.phoneNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
  };

  return (
    <Page className="!h-[100dvh] !overflow-hidden flex flex-col">
      <Navbar
        className="absolute top-0 left-0 z-20 text-white"
        left={<NavbarBackLink onClick={() => router.back()} text="Back" className="text-white" />}
      />

      {/* Main Content Area - Flex Column */}
      <div className="flex-1 flex flex-col min-h-0 relative">

        {/* Image Container - Takes available space */}
        <div className="flex-1 relative bg-black min-h-0">
          <Image
            src={post.imageUrl}
            alt={post.description || "Nail Art"}
            fill
            className="object-cover"
            priority
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
          {isPortfolioMode ? (
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

              <Button
                large
                onClick={handleBookClick}
                className="bg-green-500 active:bg-green-600"
              >
                <MessageCircle className="w-5 h-5 mr-2" />
                Chat about this Look
              </Button>
            </Block>
          ) : (
            <>
              <Block className="!my-0 !py-2">
                <h2 className="text-sm font-semibold text-gray-900">Similar Works Nearby</h2>
              </Block>

              {/* Horizontal Scroll for Matching Masters */}
              <div className="overflow-x-auto px-4 no-scrollbar flex gap-3">
                <MatchingMastersList matches={matchingMasters} />
              </div>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}
