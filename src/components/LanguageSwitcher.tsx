"use client";

import { useState, useRef, useEffect } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/routing';
import { Button } from '@/components/ui/button';
import { routing } from '@/i18n/routing';
import { ChevronDown } from 'lucide-react';

interface LanguageSwitcherProps {
  mobile?: boolean;
}

export default function LanguageSwitcher({ mobile = false }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const switchLocale = (newLocale: string) => {
    router.replace(pathname, { locale: newLocale });
    setIsOpen(false);
  };

  // Закрывать попап при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      {mobile ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg bg-background border shadow-lg flex items-center gap-1.5 h-[40px]"
        >
          <span className="text-xs font-medium uppercase">{locale}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2"
        >
          <span className="text-xs font-medium uppercase">{locale}</span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </Button>
      )}

      {isOpen && (
        <div className="absolute top-full right-0 mt-1 z-50 min-w-[80px] bg-background border rounded-md shadow-lg overflow-hidden">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => switchLocale(loc)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors uppercase ${
                locale === loc ? 'bg-muted font-medium' : ''
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

