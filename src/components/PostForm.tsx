"use client";

import React, { useState, useEffect } from "react";
import { Block, BlockTitle, List, ListInput, Button, Chip, Dialog, DialogButton } from "konsta/react";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { UploadButton } from "@/lib/uploadthing";

interface Tag {
  id: number;
  slug: string;
  nameTranslations: any;
  category: {
    slug: string;
  };
}

interface PostFormProps {
  initialData?: {
    imageUrl?: string;
    description?: string;
    price?: number | null;
    durationMinutes?: number | null;
    tags?: { tag: Tag }[];
  };
  allTags: Tag[];
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  mode: "create" | "update";
  onDelete?: () => Promise<void>;
}

const PostForm = React.forwardRef<{ submit: () => void }, PostFormProps>(({
  initialData,
  allTags,
  onSubmit,
  isSubmitting,
  mode,
  onDelete,
}, ref) => {
  const [imageUrl, setImageUrl] = useState(initialData?.imageUrl || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [price, setPrice] = useState(initialData?.price ? initialData.price.toString() : "");
  const [duration, setDuration] = useState(initialData?.durationMinutes ? initialData.durationMinutes.toString() : "");
  const [selectedTags, setSelectedTags] = useState<number[]>(
    initialData?.tags?.map((t) => t.tag.id) || []
  );
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Group tags by category
  const groupedTags = allTags.reduce((acc, tag) => {
    const category = tag.category?.slug || "other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tag);
    return acc;
  }, {} as Record<string, Tag[]>);

  const toggleTag = (tagId: number) => {
    setSelectedTags((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSubmit = () => {
    onSubmit({
      imageUrl,
      description,
      price: price ? parseFloat(price) : undefined,
      durationMinutes: duration ? parseInt(duration) : undefined,
      tagIds: selectedTags,
    });
  };

  React.useImperativeHandle(ref, () => ({
    submit: handleSubmit
  }));

  return (
    <div>
      {mode === "create" ? (
        <Block>
          {imageUrl ? (
            <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-gray-100">
              <Image
                src={imageUrl}
                alt="Preview"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => setImageUrl("")}
                className="absolute right-2 top-2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-xl border-2 border-dashed bg-gray-50">
              <UploadButton
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                  if (res?.[0]) {
                    setImageUrl(res[0].url);
                  }
                }}
                onUploadError={(error: Error) => {
                  console.error(error);
                }}
                appearance={{
                  button: "bg-primary text-primary-foreground hover:bg-primary/90",
                  allowedContent: "hidden"
                }}
                content={{
                  button: "Upload Photo"
                }}
              />
            </div>
          )}
        </Block>
      ) : (
        <div className="relative w-full h-64 bg-black">
          {imageUrl && (
            <Image
              src={imageUrl}
              alt="Post Image"
              fill
              className="object-contain opacity-80"
            />
          )}
          <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/30">
            <p className="text-white text-center text-sm font-medium bg-black/50 p-2 rounded-lg backdrop-blur-sm">
              To change the image, please delete and create a new post.
            </p>
          </div>
        </div>
      )}

      <BlockTitle>Details</BlockTitle>
      <List strong inset>
        <ListInput
          label="Description"
          type="textarea"
          placeholder="Describe your work..."
          value={description}
          onInput={(e: any) => setDescription(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </List>

      {Object.entries(groupedTags).map(([category, tags]) => (
        <React.Fragment key={category}>
          <BlockTitle className="capitalize">{category}</BlockTitle>
          <Block strong inset>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
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
          {mode === "create" && (
            <Button large onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Publishing...
                </>
              ) : (
                "Publish Work"
              )}
            </Button>
          )}

          {mode === "update" && onDelete && (
            <Button
              large
              outline
              className="border-red-500 text-red-500"
              onClick={() => setIsDeleteConfirmOpen(true)}
              disabled={isSubmitting}
            >
              Delete Post
            </Button>
          )}
        </div>
      </Block>

      {mode === "update" && onDelete && (
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
                onClick={onDelete}
              >
                Delete
              </DialogButton>
            </>
          }
        />
      )}
    </div>
  );
});

PostForm.displayName = "PostForm";

export default PostForm;
