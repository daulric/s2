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

type UpdateAudioPayload = {
    title?: string
    description?: string
    visibility?: string
    thumbnail_path?: string | null
}

export async function updateAudioDetails(id: string, payload: UpdateAudioPayload) {
    const supabase = (await createClient()) as SupabaseClient
    const {
        data: { user },
        error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
        throw new Error("Unauthorized")
    }

    const { data: audio, error: fetchError } = await supabase
        .from("audios")
        .select("audio_id, userid")
        .eq("audio_id", id)
        .single()

    if (fetchError || !audio) {
        throw new Error("Audio not found")
    }

    if (audio.userid !== user.id) {
        throw new Error("You can only edit your own audio")
    }

    const updateData: UpdateAudioPayload = {}
    if (typeof payload.title === "string") updateData.title = payload.title.trim()
    if (typeof payload.description === "string") updateData.description = payload.description
    if (typeof payload.visibility === "string") updateData.visibility = payload.visibility.toLowerCase()
    if (payload.thumbnail_path !== undefined) updateData.thumbnail_path = payload.thumbnail_path

    const { data, error } = await supabase
        .from("audios")
        .update(updateData)
        .eq("audio_id", id)
        .select("*")
        .single()

    if (error) {
        throw new Error(error.message)
    }

    return data
}
