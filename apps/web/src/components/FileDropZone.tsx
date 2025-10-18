"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";

export default function FileDropzone({
                                         onFile,
                                         accept = { "image/*": [] },
                                     }: { onFile: (file: File) => void; accept?: Record<string, string[]> }) {
    const [name, setName] = useState<string | null>(null);

    const onDrop = useCallback((accepted: File[]) => {
        const file = accepted[0];
        if (file) {
            setName(file.name);
            onFile(file);
        }
    }, [onFile]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        accept,
        multiple: false,
        noClick: true,
    });

    return (
        <div
            {...getRootProps()}
            className={`rounded-2xl border p-6 text-sm flex flex-col items-center justify-center gap-3
      ${isDragActive ? "bg-muted" : ""}`}
        >
            <input {...getInputProps()} />
            <p>Перетащи сюда фото или</p>
            <Button type="button" variant="secondary" onClick={open}>Выбрать файл</Button>
            {name && <p className="opacity-70">Файл: {name}</p>}
        </div>
    );
}
