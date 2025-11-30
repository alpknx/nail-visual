"use client";

import React from "react";
import { Tabbar, TabbarLink, Icon } from "konsta/react";
import { House, Search, PlusSquare, User } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

export default function BottomNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  // Simple check for active state. 
  // Note: pathname includes locale, e.g. /en/dashboard
  const isActive = (path: string) => {
    if (path === "/") return pathname === "/en" || pathname === "/pl" || pathname === "/";
    return pathname?.includes(path);
  };

  return (
    <Tabbar labels className="left-0 bottom-0 fixed z-50">
      <TabbarLink
        active={isActive("/")}
        onClick={() => router.push("/")}
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
        onClick={() => router.push("/post/new")}
        icon={
          <Icon
            ios={<PlusSquare className="w-7 h-7" />}
            material={<PlusSquare className="w-7 h-7" />}
          />
        }
        label="Upload"
      />
      <TabbarLink
        active={isActive("/dashboard")}
        onClick={() => router.push("/dashboard")}
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
