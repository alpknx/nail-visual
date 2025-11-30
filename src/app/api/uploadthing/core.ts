import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

const f = createUploadthing();

const auth = async () => {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;
    return session.user;
};

export const ourFileRouter = {
    imageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await auth();
            if (!user) throw new UploadThingError("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ file, metadata }) => {
            return { uploadedBy: metadata.userId, ufsUrl: file.ufsUrl };
        }),
} satisfies FileRouter;
export type OurFileRouter = typeof ourFileRouter;