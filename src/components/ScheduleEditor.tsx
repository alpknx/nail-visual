"use client";

import { useState, useEffect } from "react";
import { Page, Navbar, NavbarBackLink, Block, BlockTitle, List, ListItem, Button, Toggle } from "konsta/react";
import { useRouter, useParams } from "next/navigation";
import { getMasterSchedule, upsertMasterSchedule } from "@/app/actions";
import { toast } from "sonner";

const DAYS = [
  { dayOfWeek: 1, label: "Monday" },
  { dayOfWeek: 2, label: "Tuesday" },
  { dayOfWeek: 3, label: "Wednesday" },
  { dayOfWeek: 4, label: "Thursday" },
  { dayOfWeek: 5, label: "Friday" },
  { dayOfWeek: 6, label: "Saturday" },
  { dayOfWeek: 7, label: "Sunday" },
];

const TIMEZONES = [
  "Europe/Warsaw",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
  "Europe/Kyiv",
  "Europe/Moscow",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Dubai",
  "Australia/Sydney",
];

interface DayRange {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

type WeekRanges = Record<number, DayRange>;

const DEFAULT_RANGE: DayRange = { enabled: false, startTime: "09:00", endTime: "18:00" };

export default function ScheduleEditor({ masterId }: { masterId: string }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  const [timezone, setTimezone] = useState("Europe/Warsaw");
  const [ranges, setRanges] = useState<WeekRanges>(() =>
    Object.fromEntries(DAYS.map((d) => [d.dayOfWeek, { ...DEFAULT_RANGE }]))
  );
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    getMasterSchedule(masterId).then((schedule) => {
      if (schedule) {
        setTimezone(schedule.timezone);
        const loaded: WeekRanges = Object.fromEntries(
          DAYS.map((d) => [d.dayOfWeek, { ...DEFAULT_RANGE }])
        );
        for (const r of schedule.ranges) {
          loaded[r.dayOfWeek] = {
            enabled: true,
            startTime: r.startTime,
            endTime: r.endTime,
          };
        }
        setRanges(loaded);
      }
      setFetching(false);
    });
  }, [masterId]);

  const toggleDay = (day: number) => {
    setRanges((prev) => ({
      ...prev,
      [day]: { ...prev[day], enabled: !prev[day].enabled },
    }));
  };

  const updateTime = (day: number, field: "startTime" | "endTime", value: string) => {
    setRanges((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  };

  const handleSave = async () => {
    const activeRanges = DAYS.filter((d) => ranges[d.dayOfWeek].enabled).map((d) => ({
      dayOfWeek: d.dayOfWeek,
      startTime: ranges[d.dayOfWeek].startTime,
      endTime: ranges[d.dayOfWeek].endTime,
    }));

    setLoading(true);
    try {
      await upsertMasterSchedule({ timezone, ranges: activeRanges });
      toast.success("Schedule saved");
      router.push(`/${locale}/profile`);
    } catch (e) {
      toast.error("Failed to save schedule");
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <Page>
        <Navbar title="Working Hours" />
        <Block className="text-center mt-10">Loading...</Block>
      </Page>
    );
  }

  return (
    <Page>
      <Navbar
        title="Working Hours"
        left={<NavbarBackLink onClick={() => router.back()} text="Back" />}
      />

      <BlockTitle>Timezone</BlockTitle>
      <List strong inset>
        <ListItem
          title="Timezone"
          after={
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="bg-transparent text-right text-sm outline-none"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace("_", " ")}
                </option>
              ))}
            </select>
          }
        />
      </List>

      <BlockTitle>Working Days</BlockTitle>
      <List strong inset>
        {DAYS.map(({ dayOfWeek, label }) => {
          const range = ranges[dayOfWeek];
          return (
            <ListItem
              key={dayOfWeek}
              title={label}
              after={
                <Toggle
                  checked={range.enabled}
                  onChange={() => toggleDay(dayOfWeek)}
                />
              }
            >
              {range.enabled && (
                <div className="flex items-center gap-2 mt-2 pb-2">
                  <input
                    type="time"
                    value={range.startTime}
                    onChange={(e) => updateTime(dayOfWeek, "startTime", e.target.value)}
                    className="border rounded px-2 py-1 text-sm flex-1"
                  />
                  <span className="text-gray-400 text-sm">–</span>
                  <input
                    type="time"
                    value={range.endTime}
                    onChange={(e) => updateTime(dayOfWeek, "endTime", e.target.value)}
                    className="border rounded px-2 py-1 text-sm flex-1"
                  />
                </div>
              )}
            </ListItem>
          );
        })}
      </List>

      <Block>
        <Button large onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Schedule"}
        </Button>
      </Block>
    </Page>
  );
}
