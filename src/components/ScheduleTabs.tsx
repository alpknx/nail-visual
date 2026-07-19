"use client";

import { useState } from "react";
import { Page, Navbar, NavbarBackLink } from "konsta/react";
import { useRouter } from "next/navigation";
import ScheduleEditor from "@/components/ScheduleEditor";
import OverridesList from "@/components/OverridesList";

type Tab = "hours" | "timeoff";

export default function ScheduleTabs({
  masterId,
  timezone,
}: {
  masterId: string;
  timezone: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("hours");

  return (
    <Page>
      <Navbar
        title="Schedule"
        left={<NavbarBackLink onClick={() => router.back()} text="Back" />}
      />

      <div className="flex px-4 pt-2 pb-1 gap-1 sticky top-0 bg-white z-10 border-b border-gray-100">
        <button
          onClick={() => setTab("hours")}
          className={[
            "flex-1 py-2 rounded-xl text-sm font-medium transition-colors",
            tab === "hours" ? "bg-black text-white" : "bg-gray-100 text-gray-600",
          ].join(" ")}
        >
          Weekly Hours
        </button>
        <button
          onClick={() => setTab("timeoff")}
          className={[
            "flex-1 py-2 rounded-xl text-sm font-medium transition-colors",
            tab === "timeoff" ? "bg-black text-white" : "bg-gray-100 text-gray-600",
          ].join(" ")}
        >
          Time Off
        </button>
      </div>

      {tab === "hours" ? (
        <ScheduleEditor masterId={masterId} />
      ) : (
        <OverridesList masterId={masterId} timezone={timezone} />
      )}
    </Page>
  );
}
