"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, LogOut } from "lucide-react";
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Button } from "konsta/react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { signOut } from "next-auth/react";

interface DashboardClientProps {
  profile: {
    businessName: string;
    phoneNumber: string;
  };
  masterPosts: {
    id: string;
    imageUrl: string;
    description: string | null;
    price: number | null;
    currency: string | null;
  }[];
}

export default function DashboardClient({ profile, masterPosts }: DashboardClientProps) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || 'en';

  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: "/signin" });
  };

  const handleBack = () => {
    // If there's a referrer and it's not the same page, go back
    if (typeof window !== 'undefined' && document.referrer && !document.referrer.includes('/profile')) {
      router.back();
    } else {
      // Otherwise go to home
      router.push('/');
    }
  };

  return (
    <Page>
      <Navbar
        left={<NavbarBackLink onClick={handleBack} text="Back" />}
        className="relative z-10 bg-white dark:bg-gray-900"
      />
      <List strong inset className="!shadow-none profile-list">
        <ListItem className="!h-auto !p-0 profile-list-item">
          <div className="flex items-center gap-4 w-full py-1 pl-2 pr-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500 flex-shrink-0">
              {profile.businessName[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-base">{profile.businessName}</div>
              <div className="text-sm text-gray-500 mt-0.5">{profile.phoneNumber}</div>
            </div>
            <Button
              onClick={handleLogout}
              clear
              className="!w-10 !h-10 !p-0 flex items-center justify-center flex-shrink-0 rounded-full"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </ListItem>
      </List>

      <BlockTitle className="!shadow-none" style={{ textShadow: 'none' }}>Your Portfolio</BlockTitle>
      <Block className="!p-0">
        <div className="grid grid-cols-3 gap-1">
          {masterPosts.map((post) => (
            <Link
              key={post.id}
              href={`/${locale}/post/${post.id}?source=profile`}
              prefetch={true}
              className="relative aspect-square bg-gray-100"
              onMouseEnter={() => router.prefetch(`/${locale}/post/${post.id}?source=profile`)}
            >
              <Image
                src={post.imageUrl}
                alt={post.description || "Nail Art"}
                fill
                className="object-cover"
                loading="lazy"
                sizes="(max-width: 768px) 33vw, 200px"
              />
            </Link>
          ))}
        </div>
      </Block>
    </Page>
  );
}
