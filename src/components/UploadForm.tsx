"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UploadButton } from "@/lib/uploadthing";
import { createPost } from "@/app/actions";
import { Loader2, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { log } from "console";

// --- Types & Constants ---

type Tag = {
  id: number;
  slug: string;
  nameTranslations: Record<string, string>;
  category: {
    slug: string;
    nameTranslations: Record<string, string>;
  };
};

const COLORS_MAP: Record<string, string> = {
  red: "#EF4444",
  pink: "#EC4899",
  nude: "#E5E5E5",
  black: "#000000",
  blue: "#3B82F6",
  green: "#22C55E",
  multi: "linear-gradient(to right, #EF4444, #3B82F6)",
  white: "#FFFFFF",
};

const formSchema = z.object({
  imageUrl: z.string().url(),
  technique: z.number().optional(), // Tag ID
  shape: z.number().optional(),     // Tag ID
  styles: z.array(z.number()).min(1, "Select at least one style"), // Tag IDs
  color: z.number().optional(),     // Tag ID
  price: z.coerce.number().min(1, "Price must be at least 1").optional(),
  durationMinutes: z.coerce.number().min(15, "Duration must be at least 15 mins").optional(),
});

export function UploadForm({ tags }: { tags: Tag[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);


  console.log(tags);
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      styles: [],
      imageUrl: "",
    },
    mode: "onChange",
  });

  const watchedImageUrl = watch("imageUrl");
  const watchedStyles = watch("styles");
  const watchedTechnique = watch("technique");
  const watchedShape = watch("shape");
  const watchedColor = watch("color");

  console.log({ watchedImageUrl, watchedStyles, watchedTechnique, watchedShape, watchedColor });


  // --- Filter Tags ---
  const techniqueTags = tags.filter((t) => t.category.slug === "technique");
  const shapeTags = tags.filter((t) => t.category.slug === "shape");
  const styleTags = tags.filter((t) => t.category.slug === "design" || t.category.slug === "style");
  const colorTags = tags.filter((t) => t.category.slug === "color");

  // --- Handlers ---

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Combine all selected tag IDs
      const allTagIds = [
        ...(data.technique ? [data.technique] : []),
        ...(data.shape ? [data.shape] : []),
        ...(data.color ? [data.color] : []),
        ...data.styles,
      ];

      await createPost({
        imageUrl: data.imageUrl,
        tagIds: allTagIds,
        price: data.price,
        durationMinutes: data.durationMinutes,
        description: "", // Not in requirements, but schema has it
      });

      // Toast would go here
      alert("Work added! It is now visible to clients...");
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      alert("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* Header */}
      <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <h1 className="font-semibold text-lg">New Post</h1>
        <div className="w-8" /> {/* Spacer */}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-8">

        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Photo
          </label>
          {watchedImageUrl ? (
            <div className="relative aspect-[4/5] w-full rounded-lg overflow-hidden border border-gray-200">
              <Image
                src={watchedImageUrl}
                alt="Uploaded work"
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => setValue("imageUrl", "")}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white text-red-500 p-2 rounded-full shadow-sm transition-colors"
              >
                ✕
              </button>
            </div>
          ) : (
            <UploadButton
              endpoint="imageUploader"
              onUploadBegin={(name) => {
                console.log("Upload started:", name);
              }}
              onClientUploadComplete={(res) => {
                console.log("Upload response:", res);
                if (res && res[0]) {
                  // Try to get URL from standard property or serverData
                  const url = res[0].url || (res[0].serverData as any)?.ufsUrl;
                  console.log("Found URL:", url);

                  if (url) {
                    setValue("imageUrl", url, { shouldValidate: true, shouldDirty: true });
                  } else {
                    console.error("No URL found in response");
                    alert("Upload failed: No URL returned");
                  }
                }
              }}
              onUploadError={(error: Error) => {
                console.error("Upload error:", error);
                alert(`ERROR! ${error.message}`);
              }}
              className="ut-button:bg-black ut-button:ut-readying:bg-black/50 ut-button:ut-uploading:bg-black/50"
            />
          )}
        </div>

        {/* Section 1: Technique (Single Select) */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Technique</h3>
          <div className="flex flex-wrap gap-2">
            {techniqueTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setValue("technique", tag.id, { shouldValidate: true })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${watchedTechnique === tag.id
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
              >
                {tag.nameTranslations["en"] || tag.slug}
              </button>
            ))}
          </div>
        </section>

        {/* Section 2: Shape (Single Select) */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Shape</h3>
          <div className="flex flex-wrap gap-2">
            {shapeTags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => setValue("shape", tag.id, { shouldValidate: true })}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${watchedShape === tag.id
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                  }`}
              >
                {tag.nameTranslations["en"] || tag.slug}
              </button>
            ))}
          </div>
        </section>

        {/* Section 3: Style (Multi Select) */}
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Style <span className="text-gray-400 font-normal">(Select at least one)</span></h3>
          <div className="flex flex-wrap gap-2">
            {styleTags.map((tag) => {
              const isSelected = watchedStyles.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => {
                    const newStyles = isSelected
                      ? watchedStyles.filter((id) => id !== tag.id)
                      : [...watchedStyles, tag.id];
                    setValue("styles", newStyles, { shouldValidate: true });
                  }}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${isSelected
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                    }`}
                >
                  {tag.nameTranslations["en"] || tag.slug}
                </button>
              );
            })}
          </div>
          {errors.styles && <p className="text-red-500 text-xs mt-1">{errors.styles.message}</p>}
        </section>

        {/* Section 4: Details (Optional) */}
        <section className="space-y-6 pt-4 border-t border-gray-100">

          {/* Color */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Color Family</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
              {colorTags.map((tag) => {
                const colorValue = COLORS_MAP[tag.slug] || "#CCCCCC";
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => setValue("color", watchedColor === tag.id ? undefined : tag.id)}
                    className={`relative w-10 h-10 rounded-full flex-shrink-0 border-2 transition-all ${watchedColor === tag.id ? "border-black scale-110" : "border-transparent"
                      }`}
                    style={{ background: colorValue }}
                    title={tag.nameTranslations["en"] || tag.slug}
                  >
                    {watchedColor === tag.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Check className={`w-4 h-4 ${tag.slug === "white" || tag.slug === "nude" ? "text-black" : "text-white"}`} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Price</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  {...register("price")}
                  className="w-full pl-7 pr-3 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                  placeholder="Starts at 50"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">Duration</label>
              <div className="relative">
                <input
                  type="number"
                  {...register("durationMinutes")}
                  className="w-full pl-3 pr-12 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                  placeholder="90"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">mins</span>
              </div>
            </div>
          </div>
        </section>

      </form>

      {/* Sticky Bottom Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 safe-area-bottom">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={!isValid || isSubmitting}
          className="w-full py-4 bg-black text-white font-bold rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-all active:scale-[0.98]"
        >
          {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Post Photo"}
        </button>
      </div>
    </div>
  );
}
