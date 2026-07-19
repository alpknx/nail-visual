"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/app/actions";
import dynamic from "next/dynamic";
import { toast } from "sonner";

const PostForm = dynamic(() => import("@/components/PostForm"), { ssr: false });
import { Page, Navbar, NavbarBackLink, Link, Block } from "konsta/react";

type TranslationJSON = { [lang: string]: string };

interface UploadFormTag {
  id: number;
  slug: string;
  nameTranslations: TranslationJSON;
  category: { slug: string };
}

interface UploadFormProps {
  allTags: UploadFormTag[];
}

export function UploadForm({ allTags }: UploadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref to trigger submit from Navbar
  const formRef = React.useRef<{ submit: () => void }>(null);

  const onSubmit = async (values: {
    imageUrl: string;
    blurDataUrl?: string;
    description: string;
    price?: number;
    durationMinutes?: number;
    tagIds: number[];
  }) => {
    setIsSubmitting(true);
    try {
      await createPost({
        imageUrl: values.imageUrl,
        blurDataUrl: values.blurDataUrl,
        description: values.description,
        price: values.price,
        durationMinutes: values.durationMinutes,
        tagIds: values.tagIds,
      });

      // router.push("/profile"); // Handled by server action redirect
    } catch (error) {
      // createPost() redirects on success, which throws a NEXT_REDIRECT-
      // digest error - let that propagate instead of treating it as a
      // failure (same pattern as onboarding/page.tsx).
      const err = error as { digest?: string } | undefined;
      if (err?.digest?.startsWith("NEXT_REDIRECT")) {
        return;
      }
      console.error(error);
      toast.error("Failed to create post. Please try again.");
      setIsSubmitting(false);
    }
  };

  const triggerSubmit = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Page className="!h-[100dvh] !overflow-y-auto">
      <Navbar
        transparent
        title="New Post"
        left={<NavbarBackLink onClick={() => router.back()} text="Cancel" />}
      />

      <div className="pb-safe">
        <PostForm
          mode="create"
          allTags={allTags}
          onSubmit={onSubmit}
          isSubmitting={isSubmitting}
          ref={formRef}
        />
      </div>

    </Page>
  );
}
