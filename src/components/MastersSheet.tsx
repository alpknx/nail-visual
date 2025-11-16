"use client";

import { useRouter } from "@/i18n/routing";
import Image from "next/image";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useTranslations } from 'next-intl';
import { Check } from "lucide-react";

interface Master {
  id: string;
  name: string | null;
  image: string | null;
  city: string | null;
  instagram: string | null;
  minPricePln: number | null;
  isVerified: boolean;
  matchingWorksCount: number;
  sampleUrl: string | null;
}

interface MastersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  masters: Master[];
  city?: string;
}

export default function MastersSheet({
  isOpen,
  onClose,
  masters,
  city,
}: MastersSheetProps) {
  const t = useTranslations('designs');
  const tMasters = useTranslations('masters');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const handleMasterClick = (masterId: string) => {
    onClose();
    router.push(`/pros/${masterId}`);
  };

  const handleShowAll = () => {
    onClose();
    router.push("/pros");
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="bottom" className="h-[80vh]">
        <SheetHeader>
          <SheetTitle>
            {city
              ? t('mastersInCity', { count: masters.length, city }) || `${masters.length} мастеров в ${city}`
              : t('mastersAvailable', { count: masters.length }) || `${masters.length} мастеров`}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 overflow-y-auto pb-4">
          {masters.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('noMasters') || "Пока нет мастеров"}
            </p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {masters.map((master) => (
                  <button
                    key={master.id}
                    onClick={() => handleMasterClick(master.id)}
                    className="group rounded-xl border overflow-hidden hover:border-foreground transition-colors text-left"
                  >
                    {/* Превью работы мастера */}
                    <div className="relative aspect-[3/4] bg-muted">
                      {master.sampleUrl ? (
                        <Image
                          src={master.sampleUrl}
                          alt={master.name || tMasters('master') || "Master"}
                          fill
                          sizes="(max-width: 640px) 50vw, 33vw"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                          {tMasters('noWorks') || 'Нет работ'}
                        </div>
                      )}
                    </div>
                    {/* Информация о мастере */}
                    <div className="p-3 space-y-1">
                      <div className="flex items-center gap-1">
                        <div className="font-medium text-sm truncate flex-1">
                          {master.name || `${tMasters('master')} ${master.id.slice(0, 6)}`}
                        </div>
                        {master.isVerified && (
                          <Check className="w-3 h-3 text-primary flex-shrink-0" />
                        )}
                      </div>
                      <div className="text-xs opacity-70">
                        {master.city || "—"} • {master.matchingWorksCount} {tMasters('works') || "работ"}
                      </div>
                      {master.minPricePln && (
                        <div className="text-xs opacity-60">
                          {tMasters('from') || "от"} {master.minPricePln} PLN
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
              <div className="pt-4 mt-4 border-t">
                <Button
                  onClick={handleShowAll}
                  variant="outline"
                  className="w-full"
                >
                  {t('showAllMasters') || "Показать всех мастеров"} →
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

