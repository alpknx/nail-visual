"use client";

import React, { useEffect } from "react";
import { Tabbar, TabbarLink, Icon } from "konsta/react";
import { House, Search, PlusSquare, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Prefetch routes on mount for instant navigation
  useEffect(() => {
    router.prefetch("/");
    router.prefetch("/post/new");
    router.prefetch("/profile");
  }, [router]);

  // Simple check for active state. 
  // Note: pathname includes locale, e.g. /en/profile
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/en" || pathname === "/pl" || pathname === "/";
    return pathname?.includes(path);
  };

  // Fast navigation handlers
  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <Tabbar labels className="left-0 bottom-0 fixed z-50">
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
    </Tabbar>
  );
}
