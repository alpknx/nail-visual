import { Loader2 } from "lucide-react";

export default function PostDetailLoading() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
