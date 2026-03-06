"use server"

import { createClient } from "@/lib/supabase/server"
import convertToAudio, { AudioInfoProps } from "@/lib/audios/data-to-audio-format"
import { SupabaseClient } from "@supabase/supabase-js"

export async function GetAudioDetails(id: string, time_allowed: number = 60): Promise<AudioInfoProps | null> {
    const supabase = (await createClient()) as SupabaseClient

    const { data, error } = await supabase
        .from("audios")
        .select("*")
        .eq("audio_id", id)
        .single()

    if (error) return null

    return await convertToAudio(supabase, data, time_allowed, true)
}

export async function GetPublicAudios(time_allowed = 60): Promise<AudioInfoProps[] | null> {
    const supabase = (await createClient()) as SupabaseClient

    const { data, error } = await supabase
        .from("audios")
        .select("*")
        .eq("visibility", "public")

    if (error) return null

    return await Promise.all(data.map((i) => convertToAudio(supabase, i, time_allowed)))
}
