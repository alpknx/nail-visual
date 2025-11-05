"use client";

import { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useClient } from "@/hooks/useClient";

interface BurgerMenuProps {
  children?: React.ReactNode;
}

export default function BurgerMenu({ children }: BurgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
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
    signOut({ callbackUrl: "/" });
  };

  return (
    <>
      {/* Кнопка бургер-меню */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden fixed top-2 left-2 z-50 p-2 rounded-lg bg-background border shadow-lg"
        aria-label="Открыть меню"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Sheet меню слева */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[80vw] sm:w-[320px] p-0">
          <SheetHeader className="p-4 border-b space-y-2">
            <SheetTitle className="text-left">Меню</SheetTitle>
            {mounted && session && (
              <div className="text-xs text-muted-foreground">
                <p className="font-medium">
                  Роль: <span className="capitalize text-foreground">{role === "pro" ? "master" : role}</span>
                </p>
                {session.user?.email && (
                  <p className="mt-1 truncate">{session.user.email}</p>
                )}
              </div>
            )}
          </SheetHeader>
          
          <nav className="flex flex-col h-full">
            <div className="flex-1 p-4 space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => handleNavigation("/")}
              >
                Главная
              </Button>

              {mounted && session && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigation(role === "pro" ? "/pro/profile" : "/profile")}
                  >
                    Профиль
                  </Button>

                  {isClient && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleNavigation("/references/new")}
                    >
                      Хочу
                    </Button>
                  )}

                  {isMaster && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleNavigation("/pro/orders")}
                    >
                      Заказы
                    </Button>
                  )}

                  {isClient && (
                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => handleNavigation("/client/offers")}
                    >
                      Офферы
                    </Button>
                  )}
                </>
              )}

              {!session && (
                <>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigation("/signin")}
                  >
                    Войти
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full justify-start"
                    onClick={() => handleNavigation("/signup")}
                  >
                    Регистрация
                  </Button>
                </>
              )}
            </div>

            <div className="p-4 border-t space-y-2">
              <Button
                variant="ghost"
                className="w-full justify-start text-xs opacity-70"
                onClick={() => handleNavigation("/privacy")}
              >
                Политика конфиденциальности
              </Button>
              {mounted && session && (
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  onClick={handleSignOut}
                >
                  Выйти
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

