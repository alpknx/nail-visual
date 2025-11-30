"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Page, Navbar, NavbarBackLink, Link } from "konsta/react";
import { updatePostDetails, deletePost } from "@/app/actions";
import PostForm from "@/components/PostForm";

interface UpdatePostClientProps {
  post: any;
  allTags: any[];
}

export default function UpdatePostClient({ post, allTags }: UpdatePostClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We need a ref or state to trigger submit from Navbar
  // Since PostForm handles its own state, we might need to lift state up OR 
  // simply pass a ref. But simpler: PostForm exposes data via onChange?
  // Actually, the requirement was "Save Changes" in Navbar.
  // PostForm has internal state. To trigger submit from Navbar, we need to control the form from here.
  // Let's refactor PostForm to be controlled OR expose a ref.
  // For now, let's just make PostForm accept a ref if possible, or move the state back here?
  // Moving state back here defeats the purpose of "unifying".
  // Better: PostForm can accept a `triggerSubmit` prop? No.
  // Let's use a ref to call submit on the child.

  const formRef = React.useRef<{ submit: () => void }>(null);

  const handleUpdate = async (data: any) => {
    setIsSubmitting(true);
    try {
      await updatePostDetails({
        postId: post.id,
        tagIds: data.tagIds,
        price: data.price,
        durationMinutes: data.durationMinutes,
      });
      // router.push("/dashboard"); 
    } catch (error) {
      console.error("Failed to update tags", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);
    try {
      await deletePost(post.id);
    } catch (error) {
      console.error("Failed to delete post", error);
      setIsSubmitting(false);
    }
  };

  // Wrapper to trigger form submit from Navbar
  const triggerSubmit = () => {
    if (formRef.current) {
      formRef.current.submit();
    }
  };

  return (
    <Page className="pb-12">
      <Navbar
        title="Edit Details"
        left={<NavbarBackLink onClick={() => router.back()} text="Cancel" />}
        right={
          <Link onClick={triggerSubmit} className={isSubmitting ? "opacity-50" : ""}>
            {isSubmitting ? "Saving..." : "Save"}
          </Link>
        }
      />

      <PostForm
        mode="update"
        initialData={post}
        allTags={allTags}
        onSubmit={handleUpdate}
        onDelete={handleDelete}
        isSubmitting={isSubmitting}
        // @ts-ignore - we'll add useImperativeHandle to PostForm next
        ref={formRef}
      />
    </Page>
  );
}
