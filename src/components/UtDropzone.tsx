"use client";
import { UploadDropzone } from "@uploadthing/react";
import "@uploadthing/react/styles.css";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export default function UtDropzone({ onUrl }: { onUrl: (url: string) => void }) {
    return (
        <div className="rounded-2xl border p-4">
            <UploadDropzone<OurFileRouter, "imageUploader">
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                    const url =
                        res?.[0]?.ufsUrl ??
                        // если вернули в serverData:
                        (res?.[0] as { serverData?: { url?: string } })?.serverData?.url ??
                        // legacy fallback:
                        res?.[0]?.url;

                    if (url) onUrl(url);
                }}
                onUploadError={(e) => alert(e.message)}
            />
        </div>
    );
}