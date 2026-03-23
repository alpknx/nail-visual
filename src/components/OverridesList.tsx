"use client";

import { useState, useEffect } from "react";
import { Block, BlockTitle, List, ListItem, Button } from "konsta/react";
import { Trash2 } from "lucide-react";
import { getMasterOverrides, createMasterOverride, deleteMasterOverride } from "@/app/actions";
import { toZonedTime } from "date-fns-tz";
import { format } from "date-fns";
import { toast } from "sonner";

interface Override {
  id: string;
  startDatetimeUtc: Date;
  endDatetimeUtc: Date;
  notes: string | null;
}

export default function OverridesList({
  masterId,
  timezone,
}: {
  masterId: string;
  timezone: string;
}) {
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [fetching, setFetching] = useState(true);

  // New override form state
  const [startDatetime, setStartDatetime] = useState("");
  const [endDatetime, setEndDatetime] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    const data = await getMasterOverrides(masterId);
    setOverrides(data as Override[]);
    setFetching(false);
  };

  useEffect(() => {
    load();
  }, [masterId]);

  const formatLocal = (utcDate: Date) => {
    const local = toZonedTime(new Date(utcDate), timezone);
    return format(local, "MMM d, yyyy HH:mm");
  };

  const handleAdd = async () => {
    if (!startDatetime || !endDatetime) {
      toast.error("Start and end times are required");
      return;
    }

    setAdding(true);
    try {
      await createMasterOverride({
        startDatetimeUtc: new Date(startDatetime).toISOString(),
        endDatetimeUtc: new Date(endDatetime).toISOString(),
        notes: notes || undefined,
      });
      setStartDatetime("");
      setEndDatetime("");
      setNotes("");
      toast.success("Block added");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add block");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteMasterOverride(id);
      toast.success("Block removed");
      setOverrides((prev) => prev.filter((o) => o.id !== id));
    } catch {
      toast.error("Failed to remove block");
    }
  };

  return (
    <>
      <BlockTitle>Blocked Times</BlockTitle>

      {fetching ? (
        <Block>
          <p className="text-sm text-gray-500">Loading...</p>
        </Block>
      ) : overrides.length === 0 ? (
        <Block>
          <p className="text-sm text-gray-400">No upcoming blocks.</p>
        </Block>
      ) : (
        <List strong inset>
          {overrides.map((o) => (
            <ListItem
              key={o.id}
              title={`${formatLocal(o.startDatetimeUtc)} – ${formatLocal(o.endDatetimeUtc)}`}
              subtitle={o.notes ?? undefined}
              after={
                <button
                  onClick={() => handleDelete(o.id)}
                  className="text-red-500 p-1"
                  aria-label="Delete block"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              }
            />
          ))}
        </List>
      )}

      <BlockTitle>Add Block</BlockTitle>
      <List strong inset>
        <ListItem
          title="From"
          after={
            <input
              type="datetime-local"
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
              className="bg-transparent text-sm text-right outline-none"
            />
          }
        />
        <ListItem
          title="To"
          after={
            <input
              type="datetime-local"
              value={endDatetime}
              onChange={(e) => setEndDatetime(e.target.value)}
              className="bg-transparent text-sm text-right outline-none"
            />
          }
        />
        <ListItem
          title="Notes (optional)"
          after={
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lunch break"
              className="bg-transparent text-sm text-right outline-none placeholder:text-gray-400"
            />
          }
        />
      </List>

      <Block>
        <Button large onClick={handleAdd} disabled={adding}>
          {adding ? "Adding..." : "Add Block"}
        </Button>
      </Block>
    </>
  );
}
