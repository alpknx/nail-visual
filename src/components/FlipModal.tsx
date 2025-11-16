"use client";

import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import Image from "next/image";
import { X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FlipModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  children: React.ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  submitDisabled?: boolean;
}

export default function FlipModal({
  isOpen,
  onClose,
  imageUrl,
  title,
  children,
  onSubmit,
  submitLabel,
  submitDisabled = false,
}: FlipModalProps) {
  const tCommon = useTranslations('common');
  const defaultSubmitLabel = submitLabel || tCommon('submit');
  const [isFlipped, setIsFlipped] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsFlipped(false);
      // Небольшая задержка для плавного переворота
      const timer = setTimeout(() => setIsFlipped(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsFlipped(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[90vh]">
        <div className="relative w-full h-[70vh] min-h-[400px] perspective-1000">
          {/* 3D Flip Container */}
          <div
            className={cn(
              "w-full h-full relative transition-transform duration-700 ease-in-out",
              isFlipped ? "[transform:rotateY(180deg)]" : "[transform:rotateY(0deg)]"
            )}
            style={{ transformStyle: "preserve-3d" }}
          >
            {/* Front side - Image */}
            <div
              className="absolute inset-0 w-full h-full"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(0deg)",
              }}
            >
              <div className="relative w-full h-full">
                <Image
                  src={imageUrl}
                  alt={title || "Image"}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority
                />
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label={tCommon('cancel')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Back side - Form */}
            <div
              className="absolute inset-0 w-full h-full overflow-y-auto bg-background"
              style={{
                backfaceVisibility: "hidden",
                WebkitBackfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
              }}
            >
              <div className="p-6 space-y-4 min-h-full flex flex-col">
                {title && (
                  <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                  </DialogHeader>
                )}
                
                <div className="relative w-full h-48 rounded-lg overflow-hidden flex-shrink-0">
                  <Image
                    src={imageUrl}
                    alt={title || "Image"}
                    fill
                    sizes="100vw"
                    className="object-cover"
                  />
                </div>

                <div className="flex-1 space-y-4">{children}</div>

                {onSubmit && (
                  <div className="pt-4 border-t flex-shrink-0">
                    <Button
                      onClick={onSubmit}
                      disabled={submitDisabled}
                      className="w-full"
                      size="lg"
                    >
                      {defaultSubmitLabel}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

