"use client";
import { useTranslations } from 'next-intl';
import { useQuery } from "@tanstack/react-query";
import { fetchCities } from "@/lib/meta";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function CitySelect({
    value,
    onChange,
    placeholder,
}: {
    value?: string;
    onChange?: (v: string) => void;
    placeholder?: string;
}) {
    const tCommon = useTranslations('common');
    const defaultPlaceholder = placeholder || tCommon('selectCity');
    const { data: cities = [] } = useQuery({ queryKey: ["cities"], queryFn: fetchCities });

    return (
        <Select value={value || ""} onValueChange={(v) => onChange?.(v)}>
            <SelectTrigger className="w-full">
                <SelectValue placeholder={defaultPlaceholder} />
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
