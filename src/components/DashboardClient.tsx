"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Page, Navbar, Block, BlockTitle, List, ListItem, Button } from "konsta/react";

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
  return (
    <Page>
      <BlockTitle>Profile</BlockTitle>
      <List strong inset>
        <ListItem
          title={profile.businessName}
          subtitle={profile.phoneNumber}
          media={
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
              {profile.businessName[0]}
            </div>
          }
        />
      </List>

      <BlockTitle>Your Portfolio</BlockTitle>
      <Block className="!p-0">
        <div className="grid grid-cols-3 gap-1">
          {masterPosts.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="relative aspect-square bg-gray-100"
            >
              <Image
                src={post.imageUrl}
                alt={post.description || "Nail Art"}
                fill
                className="object-cover"
              />
            </Link>
          ))}
        </div>
      </Block>

      {/* Spacer for bottom nav */}
      <Block className="h-20" />
    </Page>
  );
}
