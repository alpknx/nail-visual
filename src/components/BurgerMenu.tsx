"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { Link, useRouter, usePathname } from '@/i18n/routing';
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useClient } from "@/hooks/useClient";
import LanguageSwitcher from "./LanguageSwitcher";
import GeolocationDisplay from "./GeolocationDisplay";

interface BurgerMenuProps {
  children?: React.ReactNode;
}

export default function BurgerMenu({ children }: BurgerMenuProps) {
  const t = useTranslations('common');
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const mounted = useClient();
  const role = session?.user?.role ?? "guest";
  const isMaster = role === "pro" || role === "admin";
  const isClient = role === "client" || role === "admin";

  // Закрыть меню при изменении маршрута (App Router не имеет events)
  // Меню закрывается через handleNavigation

  // Обработка свайпа слева направо для открытия меню
  useEffect(() => {
    if (!mounted) return;

    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      const swipeDistance = touchEndX - touchStartX;
      
      // Открываем меню при свайпе справа налево (от левого края экрана)
      if (touchStartX < 50 && swipeDistance > 100 && !isOpen) {
        setIsOpen(true);
      }
    };

    document.addEventListener("touchstart", handleTouchStart);
    document.addEventListener("touchend", handleTouchEnd);

    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [mounted, isOpen]);

  const handleNavigation = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  const handleSignOut = () => {
    setIsOpen(false);
    const locale = pathname.split('/')[1] || 'en';
    signOut({ callbackUrl: `/${locale}` });
  };

  const profilePath = role === "pro" ? "/pro/profile" : "/profile";

  const primaryNavItems = [
    { label: t('designs') || 'Каталог дизайнов', href: "/designs" },
    { label: t('masters') || 'Мастера', href: "/pros" },
    ...(mounted && session
      ? [{ label: t('profile'), href: profilePath }]
      : []),
    ...(mounted && session
      ? [{ label: t('favorites') || 'Избранное', href: "/favorites" }]
      : []),
    ...(mounted && isClient
      ? [{ label: t('want'), href: "/references/new" }]
      : []),
    ...(mounted && isMaster
      ? [
          { label: t('addWork') || 'Добавить работу', href: "/works/new" },
          { label: t('orders'), href: "/pro/orders" }
        ]
      : []),
    ...(mounted && isClient
      ? [{ label: t('offers'), href: "/client/offers" }]
      : []),
  ];

  const signedOutItems = !session
    ? [
        { label: t('signIn'), href: "/signin" },
        { label: t('signUp'), href: "/signup" },
      ]
    : [];

  const desktopNavItems = [...primaryNavItems, ...signedOutItems];
  const mobileNavItems = [...primaryNavItems, ...signedOutItems];

  return (
    <>
      {/* Кнопка бургер-меню */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-2 left-2 z-50 p-2 rounded-lg bg-background border shadow-lg"
        aria-label={t('openMenu')}
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Кнопка переключения языка для мобильной версии */}
      <div className="md:hidden fixed top-2 right-2 z-50">
        <LanguageSwitcher mobile />
      </div>

      {/* Отображение геолокации посередине (только для мобильной версии) */}
      <GeolocationDisplay />

      {/* Desktop navigation */}
      <header className="hidden md:block sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold tracking-tight">
              Nail Visual
            </Link>
            <nav className="flex items-center gap-2">
              {desktopNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  size="sm"
                  className="justify-start"
                  onClick={() => handleNavigation(item.href)}
                >
                  {item.label}
                </Button>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link
              href="/privacy"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('privacy')}
            </Link>
            {mounted && session && (
              <>
                <div className="text-xs text-muted-foreground text-right">
                  <p className="font-medium">
                    {t('role')}:{" "}
                    <span className="capitalize text-foreground">
                      {role === "pro" ? t('rolePro') :
                       role === "client" ? t('roleClient') :
                       role === "admin" ? t('roleAdmin') :
                       t('roleGuest')}
                    </span>
                  </p>
                  {session.user?.email && (
                    <p className="mt-1 max-w-[180px] truncate">
                      {session.user.email}
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  {t('signOut')}
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Sheet меню слева */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[80vw] sm:w-[320px] p-0">
          <SheetHeader className="p-4 border-b space-y-2">
            <SheetTitle className="text-left">{t('menu')}</SheetTitle>
            {mounted && session && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">
                  {t('role')}: <span className="capitalize text-foreground">
                    {role === "pro" ? t('rolePro') :
                     role === "client" ? t('roleClient') :
                     role === "admin" ? t('roleAdmin') :
                     t('roleGuest')}
                  </span>
                </p>
                {session.user?.email && (
                  <p className="mt-1 truncate">{session.user.email}</p>
                )}
              </div>
            )}
          </SheetHeader>
        
          <nav className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-2">
              {mobileNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => handleNavigation(item.href)}
                >
                  {item.label}
                </Button>
              ))}
            </div>

            <div className="p-4 border-t space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-xs opacity-70"
                onClick={() => handleNavigation("/privacy")}
              >
                {t('privacy')}
              </Button>
              {mounted && session && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  onClick={handleSignOut}
                >
                  {t('signOut')}
                </Button>
              )}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      {children}
    </>
  );
}
