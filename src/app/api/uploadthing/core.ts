import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import sharp from "sharp";

const f = createUploadthing();

const auth = async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user;
};

async function generateBlurDataUrl(imageUrl: string): Promise<string | null> {
    try {
        const res = await fetch(imageUrl);
        const buffer = Buffer.from(await res.arrayBuffer());
        const resized = await sharp(buffer).resize(16).webp({ quality: 40 }).toBuffer();
        return `data:image/webp;base64,${resized.toString("base64")}`;
    } catch (error) {
        // Best-effort only - a failed placeholder never blocks the upload.
        console.error("Failed to generate blur placeholder", error);
        return null;
    }
}

export const ourFileRouter = {
    imageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await auth();
            if (!user) throw new UploadThingError("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ file, metadata }) => {
            const blurDataUrl = await generateBlurDataUrl(file.ufsUrl);
            return { uploadedBy: metadata.userId, ufsUrl: file.ufsUrl, blurDataUrl };
        }),
} satisfies FileRouter;
export type OurFileRouter = typeof ourFileRouter;