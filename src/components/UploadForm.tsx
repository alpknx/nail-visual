"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { UploadButton } from "@/lib/uploadthing";
import { Loader2, X } from "lucide-react";
import Image from "next/image";
import { List, ListInput, Button, Block, BlockTitle, Chip } from "konsta/react";
import { createPost } from "@/app/actions";

const formSchema = z.object({
  imageUrl: z.string().min(1, "Image is required"),
  description: z.string().optional(),
  price: z.string().optional(),
  currency: z.string().default("PLN"),
  durationMinutes: z.string().optional(),
  technique: z.enum(["gel", "hybrid", "acrylic", "natural"]),
  shape: z.enum(["almond", "square", "oval", "stiletto", "coffin"]),
  style: z.enum(["french", "ombre", "cat-eye", "minimal", "art", "3d", "solid"]),
});

export function UploadForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      imageUrl: "",
      description: "",
      price: "",
      currency: "PLN",
      durationMinutes: "",
      technique: "hybrid",
      shape: "almond",
      style: "solid",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      await createPost({
        imageUrl: values.imageUrl,
        description: values.description,
        price: values.price ? parseFloat(values.price) : undefined,
        durationMinutes: values.durationMinutes ? parseInt(values.durationMinutes) : undefined,
        tagIds: [], // We'll handle tags later or infer them
      });

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper for chips selection
  const renderChips = (name: any, options: string[]) => (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Chip
          key={option}
          className="capitalize"
          outline={form.watch(name) !== option}
          onClick={() => form.setValue(name, option)}
        >
          {option}
        </Chip>
      ))}
    </div>
  );

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="pb-20">
      <BlockTitle>Image</BlockTitle>
      <Block>
        {previewUrl ? (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border bg-gray-100">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => {
                setPreviewUrl(null);
                form.setValue("imageUrl", "");
              }}
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
                  setPreviewUrl(res[0].url);
                  form.setValue("imageUrl", res[0].url);
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
        {form.formState.errors.imageUrl && (
          <div className="mt-2 text-sm text-red-500">
            {form.formState.errors.imageUrl.message}
          </div>
        )}
      </Block>

      <BlockTitle>Details</BlockTitle>
      <List strong inset>
        <ListInput
          label="Description"
          type="textarea"
          placeholder="Describe your work..."
          value={form.watch("description")}
          onInput={(e: any) => form.setValue("description", e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <ListInput
            label="Price (PLN)"
            type="number"
            placeholder="0.00"
            value={form.watch("price")}
            onInput={(e: any) => form.setValue("price", e.target.value)}
          />
          <ListInput
            label="Duration (min)"
            type="number"
            placeholder="60"
            value={form.watch("durationMinutes")}
            onInput={(e: any) => form.setValue("durationMinutes", e.target.value)}
          />
        </div>
      </List>

      <BlockTitle>Technique</BlockTitle>
      <Block className="!my-2">
        {renderChips("technique", ["gel", "hybrid", "acrylic", "natural"])}
      </Block>

      <BlockTitle>Shape</BlockTitle>
      <Block className="!my-2">
        {renderChips("shape", ["almond", "square", "oval", "stiletto"])}
      </Block>

      <BlockTitle>Style</BlockTitle>
      <Block className="!my-2">
        {renderChips("style", ["french", "ombre", "minimal", "art"])}
      </Block>

      <Block>
        <Button large onClick={form.handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Publishing...
            </>
          ) : (
            "Publish Work"
          )}
        </Button>
      </Block>
    </form>
  );
}
