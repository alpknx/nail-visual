import { createUploadthing } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
const f = createUploadthing();

const auth = async () => ({ id: "demo-user" });

export const ourFileRouter = {
    imageUploader: f({ image: { maxFileSize: "8MB", maxFileCount: 1 } })
        .middleware(async () => {
            const user = await auth();
            if (!user) throw new UploadThingError("Unauthorized");
            return { userId: user.id };
        })
        .onUploadComplete(async ({ file, metadata }) => {
            // В v8+ правильный публичный URL — file.ufsUrl
            return { uploadedBy: metadata.userId, ufsUrl: file.ufsUrl };
        }),
};
export type OurFileRouter = typeof ourFileRouter;