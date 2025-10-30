"use client";
import { useQuery } from "@tanstack/react-query";
import { fetchCities } from "@/lib/meta";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CitySelect({
    value,
    onChange,
    placeholder = "Город",
}: {
    value?: string;
    onChange?: (v: string) => void;
    placeholder?: string;
}) {
    const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: fetchCities });

    return (
        <Select value={value || ""} onValueChange={(v) => onChange?.(v)}>
            <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {cities.map((c) => (
                    <SelectItem key={c} value={c}>
                        {c}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
