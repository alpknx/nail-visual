"use client";

import React, { useEffect } from "react";
import { Tabbar, TabbarLink, Icon } from "konsta/react";
import { House, Search, PlusSquare, User, CalendarDays } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

export default function BottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const role = session?.user?.role;

  useEffect(() => {
    router.prefetch("/");
    if (role === "master") {
      router.prefetch("/post/new");
      router.prefetch("/profile");
      router.prefetch("/profile/calendar");
    }
    if (role === "client") {
      router.prefetch("/bookings");
    }
  }, [router, role]);

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/en" || pathname === "/pl" || pathname === "/";
    return pathname?.includes(path);
  };

  const handleNavigate = (path: string) => router.push(path);

  return (
    <Tabbar
      labels
      className="left-0 fixed z-[10000]"
      style={{
        bottom: "env(safe-area-inset-bottom, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Explore — visible to everyone */}
      <TabbarLink
        active={isActive("/")}
        onClick={() => handleNavigate("/")}
        onMouseEnter={() => router.prefetch("/")}
        icon={
          <Icon
            ios={<Search className="w-7 h-7" />}
            material={<Search className="w-7 h-7" />}
          />
        }
        label="Explore"
      />

      {/* Master tabs */}
      {role === "master" && (
        <>
          <TabbarLink
            active={isActive("/post/new")}
            onClick={() => handleNavigate("/post/new")}
            onMouseEnter={() => router.prefetch("/post/new")}
            icon={
              <Icon
                ios={<PlusSquare className="w-7 h-7" />}
                material={<PlusSquare className="w-7 h-7" />}
              />
            }
            label="Upload"
          />
          <TabbarLink
            active={isActive("/profile/calendar")}
            onClick={() => handleNavigate("/profile/calendar")}
            onMouseEnter={() => router.prefetch("/profile/calendar")}
            icon={
              <Icon
                ios={<CalendarDays className="w-7 h-7" />}
                material={<CalendarDays className="w-7 h-7" />}
              />
            }
            label="Calendar"
          />
          <TabbarLink
            active={isActive("/profile")}
            onClick={() => handleNavigate("/profile")}
            onMouseEnter={() => router.prefetch("/profile")}
            icon={
              <Icon
                ios={<User className="w-7 h-7" />}
                material={<User className="w-7 h-7" />}
              />
            }
            label="Profile"
          />
        </>
      )}

      {/* Client tabs */}
      {role === "client" && (
        <>
          <TabbarLink
            active={isActive("/bookings")}
            onClick={() => handleNavigate("/bookings")}
            onMouseEnter={() => router.prefetch("/bookings")}
            icon={
              <Icon
                ios={<CalendarDays className="w-7 h-7" />}
                material={<CalendarDays className="w-7 h-7" />}
              />
            }
            label="Bookings"
          />
          <TabbarLink
            active={isActive("/profile")}
            onClick={() => handleNavigate("/profile")}
            onMouseEnter={() => router.prefetch("/profile")}
            icon={
              <Icon
                ios={<User className="w-7 h-7" />}
                material={<User className="w-7 h-7" />}
              />
            }
            label="Profile"
          />
        </>
      )}

      {/* Unauthenticated: Upload + Profile (profile redirects to signin) */}
      {status === "unauthenticated" && (
        <>
          <TabbarLink
            active={isActive("/post/new")}
            onClick={() => handleNavigate("/post/new")}
            onMouseEnter={() => router.prefetch("/post/new")}
            icon={
              <Icon
                ios={<PlusSquare className="w-7 h-7" />}
                material={<PlusSquare className="w-7 h-7" />}
              />
            }
            label="Upload"
          />
          <TabbarLink
            active={isActive("/profile")}
            onClick={() => handleNavigate("/profile")}
            onMouseEnter={() => router.prefetch("/profile")}
            icon={
              <Icon
                ios={<User className="w-7 h-7" />}
                material={<User className="w-7 h-7" />}
              />
            }
            label="Profile"
          />
        </>
      )}
    </Tabbar>
  );
}
