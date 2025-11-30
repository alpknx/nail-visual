"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Page, Navbar, NavbarBackLink, Block, Button, Chip, Dialog, DialogButton, BlockTitle, List, ListInput, Link } from "konsta/react";
import { updatePostDetails, deletePost } from "@/app/actions";
import Image from "next/image";

interface UpdatePostClientProps {
  post: any;
  allTags: any[];
}

export default function UpdatePostClient({ post, allTags }: UpdatePostClientProps) {
  const router = useRouter();
  const [selectedTags, setSelectedTags] = useState<number[]>(
    post.tags.map((t: any) => t.tag.id)
  );
  const [price, setPrice] = useState<string>(post.price ? post.price.toString() : "");
  const [duration, setDuration] = useState<string>(post.durationMinutes ? post.durationMinutes.toString() : "");
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  // Group tags by category
  const groupedTags = allTags.reduce((acc, tag) => {
    const category = tag.category?.slug || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, any[]>);

  const handleUpdate = async () => {
    setIsSubmitting(true);
    try {
      await updatePostDetails({
        postId: post.id,
        tagIds: selectedTags,
        price: price ? parseFloat(price) : undefined,
        durationMinutes: duration ? parseInt(duration) : undefined,
      });
      // Redirect handled by server action, but we can also push
      // router.push("/dashboard"); 
    } catch (error) {
      console.error("Failed to update tags", error);
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

  return (
    <Page className="pb-12">
      <Navbar
        title="Edit Details"
        left={<NavbarBackLink onClick={() => router.back()} text="Cancel" />}
        right={
          <Link onClick={handleUpdate} className={isSubmitting ? "opacity-50" : ""}>
            {isSubmitting ? "Saving..." : "Save"}
          </Link>
        }
      />

      <div className="relative w-full h-64 bg-black">
        <Image
          src={post.imageUrl}
          alt="Post Image"
          fill
          className="object-contain opacity-80"
        />
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/30">
          <p className="text-white text-center text-sm font-medium bg-black/50 p-2 rounded-lg backdrop-blur-sm">
            To change the image, please delete and create a new post.
          </p>
        </div>
      </div>

      <List strong inset>
        <ListInput
          outline
          label="Price (PLN)"
          type="number"
          placeholder="0.00"
          value={price}
          onInput={(e: any) => setPrice(e.target.value)}
        />
        <ListInput
          outline
          label="Duration (min)"
          type="number"
          placeholder="60"
          value={duration}
          onInput={(e: any) => setDuration(e.target.value)}
        />
      </List>

      {Object.entries(groupedTags).map(([category, tags]) => (
        <React.Fragment key={category}>
          <BlockTitle className="capitalize">{category}</BlockTitle>
          <Block strong inset>
            <div className="flex flex-wrap gap-2">
              {(tags as any[]).map((tag) => (
                <Chip
                  key={tag.id}
                  className={`cursor-pointer capitalize ${selectedTags.includes(tag.id)
                    ? "bg-black text-white"
                    : "bg-gray-100 text-gray-900"
                    }`}
                  onClick={() => toggleTag(tag.id)}
                >
                  {tag.nameTranslations?.en || tag.slug}
                </Chip>
              ))}
            </div>
          </Block>
        </React.Fragment>
      ))}

      <Block>
        <div className="space-y-3">
          {/* Save button moved to Navbar */}

          <Button
            large
            outline
            className="border-red-500 text-red-500"
            onClick={() => setIsDeleteConfirmOpen(true)}
            disabled={isSubmitting}
          >
            Delete Post
          </Button>
        </div>
      </Block>

      <Dialog
        opened={isDeleteConfirmOpen}
        onBackdropClick={() => setIsDeleteConfirmOpen(false)}
        title="Delete Post?"
        content="Are you sure? This will remove it from all user Favorites."
        buttons={
          <>
            <DialogButton onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancel
            </DialogButton>
            <DialogButton
              className="text-red-500"
              onClick={handleDelete}
            >
              Delete
            </DialogButton>
          </>
        }
      />
    </Page>
  );
}
