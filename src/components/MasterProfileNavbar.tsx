"use client";

import { useRouter } from "next/navigation";
import { Navbar, NavbarBackLink } from "konsta/react";

export default function MasterProfileNavbar() {
  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  return (
    <Navbar
      left={<NavbarBackLink onClick={handleBack} text="Back" />}
      className="sticky top-0 z-10 bg-white dark:bg-gray-900"
    />
  );
}

