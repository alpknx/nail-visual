"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPost } from "@/app/actions";
import PostForm from "@/components/PostForm";
import { Page, Navbar, NavbarBackLink, Link, Block } from "konsta/react";

interface UploadFormProps {
  allTags: any[];
}

export function UploadForm({ allTags }: UploadFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Ref to trigger submit from Navbar
  const formRef = React.useRef<{ submit: () => void }>(null);

  const onSubmit = async (values: any) => {
    setIsSubmitting(true);
    try {
      await createPost({
        imageUrl: values.imageUrl,
        description: values.description,
        price: values.price,
        durationMinutes: values.durationMinutes,
        tagIds: values.tagIds,
      });

      // router.push("/profile"); // Handled by server action redirect
    } catch (error) {
      console.error(error);
      setIsSubmitting(false);
    }
  };

  const triggerSubmit = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Page className="pb-12">
      <Navbar
        transparent
        title="New Post"
        left={<NavbarBackLink onClick={() => router.back()} text="Cancel" />}
      />

      <PostForm
        mode="create"
        allTags={allTags}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        // @ts-ignore
        ref={formRef}
      />

    </Page>
  );
}
