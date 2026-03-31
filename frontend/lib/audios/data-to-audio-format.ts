import { type SupabaseClient } from "@supabase/supabase-js"

export type AudioInfoProps = {
    id: string
    creator_id: string
    audio: string
    thumbnail: string
    username: string
    avatar_url: string
    uploadDate: string
    title: string
    description: string
    listens: number
    created_at: Date | string
    visibility?: string
    audio_path?: string
    thumbnail_path?: string | null
}

export type AudioData = {
    audio_id: string
    userid?: string
    title: string
    description?: string
    audio_path?: string
    thumbnail_path?: string | null
    visibility: string
    listens?: number
    created_at: Date | string
}

export default async function convertToAudio(supabase: SupabaseClient<any, string, any>, data: AudioData, time_allowed: number = 60, signedAllowed: boolean = true): Promise<AudioInfoProps> {
    const placeholder = "/placeholder.png"

    try {
        if (!supabase) throw "A Supabase Client is Needed"

        const user = await (async () => {
            try {
                if (!data.userid) throw "No User ID"

                const { data: u, error } = await supabase
                    .from("profiles")
                    .select("username, avatar_url, is_verified")
                    .eq("id", data.userid)
                    .single()

                if (u === null || error) throw "No Data on User"
                return u
            } catch (e) {
                throw e
            }
        })()

        const [audio_url, thumbnail_url, avatar_url] = await Promise.all([
            signedAllowed && supabase.storage.from("audios").createSignedUrl(data.audio_path || "", time_allowed).then(({ data }) => data && data.signedUrl),
            signedAllowed && data.thumbnail_path && supabase.storage.from("images").createSignedUrl(data.thumbnail_path, time_allowed).then(({ data }) => data && data.signedUrl),
            user.avatar_url && supabase.storage.from("images").createSignedUrl(user.avatar_url, time_allowed).then(({ data }) => data && data.signedUrl),
        ])

        return {
            id: data.audio_id,
            creator_id: data.userid || "",
            username: user.username,
            title: data.title,
            description: data.description || "",
            listens: data.listens || 0,
            created_at: data.created_at,
            uploadDate: (new Date(data.created_at)).toDateString(),
            audio: audio_url || "",
            thumbnail: thumbnail_url || placeholder,
            avatar_url: avatar_url || `${process.env.NEXT_PUBLIC_PROFILE}${user.username}`,
            visibility: data.visibility,
            audio_path: data.audio_path || "",
            thumbnail_path: data.thumbnail_path || null,
        } satisfies AudioInfoProps
    } catch (e) {
        throw e
    }
}
