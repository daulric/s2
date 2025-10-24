import { SupabaseClient } from "@supabase/supabase-js"
import { VideoData } from "../videos/data-to-video-format"

export type UserInfoProps = {
    id: string
    username: string
    description?: string
    avatar_url?: string
    subscriber_count: number
    video_count: number
    created_at: string
}

export type UserData = {
    id: string
    username: string
    avatar_url: string
    description: string
    subscribers: []
    videos: [] | VideoData[]
    created_at: string
}

export default async function convert(supabase: SupabaseClient<any, string, any>, data: UserData, time_allowed: number = 10) {
    const placeholder = "/logo.jpeg"

    try {
        if (!supabase) throw "A Supabase Client is Needed"

        const [avatar_url] = await Promise.all([
            data.avatar_url && supabase.storage.from("images").createSignedUrl(data.avatar_url, time_allowed).then(({data}) => data && data.signedUrl),
        ]);

        const subscriber_count = data.subscribers.length;
        const video_count = data.videos.length;
    
        return {
            id: data.id,
            username: data.username,
            description: data.description,
            subscriber_count: subscriber_count,
            video_count: video_count,
            avatar_url: avatar_url || `${process.env.NEXT_PUBLIC_PROFILE}${data.username}` || placeholder,
            created_at: data.created_at,
        } satisfies UserInfoProps
    } catch (e) {
        throw e;
    }

}