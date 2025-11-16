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
      // Переворот карточки начинается одновременно с открытием модального окна
      requestAnimationFrame(() => {
        setIsFlipped(true);
      });
    } else {
      setIsFlipped(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        showCloseButton={false}
        className="sm:max-w-lg p-0 overflow-hidden max-h-[95vh] w-[calc(100%-2rem)] !top-[50%] !left-[50%] !translate-x-[-50%] !translate-y-[-50%]"
      >
        <div className="relative w-full h-[85vh] min-h-[500px] max-h-[90vh] perspective-1000">
          {/* 3D Flip Container */}
          <div
            className={cn(
              "w-full h-full relative transition-transform duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
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
              <div className="relative w-full h-full bg-black/10">
                <Image
                  src={imageUrl}
                  alt={title || "Image"}
                  fill
                  sizes="100vw"
                  className="object-cover"
                  priority
                  quality={100}
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
              <div className="p-6 space-y-4 min-h-full flex flex-col relative">
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                  aria-label={tCommon('close')}
                >
                  <X className="w-5 h-5" />
                </button>
                
                {title && (
                  <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                  </DialogHeader>
                )}
                
                <div className="relative w-full h-96 rounded-lg overflow-hidden flex-shrink-0 bg-black/5">
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

