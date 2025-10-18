"use client";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import CitySelect from "@/components/CitySelect";
import TagPicker from "@/components/TagPicker";

import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { posthog } from "@/lib/analytics";

// типы/константы домена
import { type City, type Tag, TAGS, createWork } from "@/lib/api";
import UtDropzone from "@/components/UtDropzone";

const schema = z.object({
    caption: z.string().max(200).optional().or(z.literal("")),
    city: z.string().min(1, "Укажи город"),
    tags: z.array(z.string()).min(1, "Добавь хотя бы один тег"),
});
type FormData = z.infer<typeof schema>;

export default function NewWorkPage() {
    const router = useRouter();
    const qc = useQueryClient();
    const { userId } = useAuth();

    const [imageUrl, setImageUrl] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { caption: "", city: "", tags: [] },
    });

    // ✅ Приводим string[] из формы к Tag[] через белый список
    const selectedTags = useMemo(() => {
        const allow = new Set(TAGS as readonly string[]);
        const raw = (watch("tags") as string[]) ?? [];
        return raw.filter((t) => allow.has(t)) as Tag[];
    }, [watch("tags")]);

    const createWorkMutation = useMutation({
        mutationFn: createWork,
        onSuccess: async (res) => {
            posthog.capture("create_work", {
                proId: res.proId,
                city: res.city,
                tags: res.tags,
            });
            await qc.invalidateQueries({ queryKey: ["works"] });
            toast.success("Работа добавлена");
            router.push("/");
        },
        onError: () => toast.error("Ошибка при сохранении"),
    });

    const onSubmit = async (data: FormData) => {
        if (!imageUrl) {
            toast.error("Сначала загрузи фото");
            return;
        }
        await createWorkMutation.mutateAsync({
            imageUrl,
            caption: data.caption || undefined,
            city: data.city as City,
            tags: data.tags as unknown as Tag[], // ← API ждёт Tag[]
            proId: userId,
        });
    };

    return (
        <section className="max-w-2xl mx-auto space-y-6">
            <h1 className="text-2xl font-semibold">Загрузка работы</h1>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm">Фото</label>
                    <UtDropzone onUrl={setImageUrl} />
                    <p className="text-xs text-muted-foreground">JPG/PNG, до 8MB</p>
                    {imageUrl && (
                        <div className="relative w-48 h-60 rounded-xl overflow-hidden border">
                            {/* если домены уже в next.config — можно без unoptimized */}
                            <img src={imageUrl} className="w-full h-full object-cover" alt="" />
                            {/* или <Image src={imageUrl} fill unoptimized alt="" className="object-cover" /> */}
                        </div>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm">Город</label>
                    <CitySelect
                        value={watch("city") as City}
                        onChange={(c) => setValue("city", c)}
                        placeholder="Выбери город"
                    />
                    {errors.city && (
                        <p className="text-xs text-red-500">{errors.city.message}</p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm">Теги (стили/цвета)</label>
                    <TagPicker
                        selected={selectedTags}                  // ✅ ждёт Tag[]
                        onToggle={(t) => {                       // t: Tag
                            const set = new Set<Tag>(selectedTags);
                            set.has(t) ? set.delete(t) : set.add(t);
                            // форма хранит string[], поэтому приводим обратно
                            setValue("tags", Array.from(set) as unknown as string[]);
                        }}
                    />
                    {errors.tags && (
                        <p className="text-xs text-red-500">
                            {errors.tags.message as string}
                        </p>
                    )}
                </div>

                <div className="space-y-2">
                    <label className="text-sm">Подпись (необязательно)</label>
                    <Textarea
                        placeholder="Например: нюдовый френч"
                        {...register("caption")}
                    />
                </div>

                <div className="flex gap-2">
                    <Button
                        type="submit"
                        disabled={
                            isSubmitting || createWorkMutation.isPending || !imageUrl
                        }
                    >
                        {createWorkMutation.isPending ? "Сохраняем..." : "Сохранить"}
                    </Button>
                </div>
            </form>
        </section>
    );
}
