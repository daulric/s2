"use client";

import { createClient } from "@/lib/supabase/client";

export async function compressAndUpload(file: File): Promise<string> {

    if (!file) throw new Error("No Video Provided");

    const supabase = createClient();
    const file_name = `${Date.now()}-${file.name}`

    const { error } = await supabase.storage
        .from("videos")
        .upload(file_name, file, {
        contentType: "video/webm",
        upsert: true,
        });

    if (error) throw new Error(`Upload failed: ${error.message}`);

    return file_name;
}

export async function uploadThumbnail(file: File) {
    if (!file) throw new Error("No Thumbnail Provided");

    const supabase = createClient();
    const file_name = `${Date.now()}-${file.name}`;

    const { error } = await supabase.storage.from("images").upload(file_name, file, {
        contentType: "image/webp",
        upsert: true,
    });

    if (error) throw new Error(`Upload Failed: ${error.message}`);
    return file_name;
}