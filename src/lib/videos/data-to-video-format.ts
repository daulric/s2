import { type SupabaseClient } from "@supabase/supabase-js"

export type VideoInfoProps = {
    id: string,
    creator_id: string,
    video: string,
    thumbnail: string,
    username: string,
    avatar_url: string,
    uploadDate: string,
    title: string,
    description: string,
    views: number,
    category: string,
    created_at: Date | string,
    visibility?: string,
}

export type VideoData = {
    video_id: string,
    userid?: string,
    title: string,
    description?: string,
    video_path?: string,
    thumbnail_path?: string | null,
    visibility: string,
    views?: number,
    created_at: Date | string,
    category: string,
}

export default async function convert(supabase: SupabaseClient, data: VideoData, time_allowed: number = 10) {
    const placeholder = "/placeholder.png"

    try {
        if (!supabase) throw "A Supabase Client is Needed"

        const user = await (async () => {
            try {
                if (!data.userid) throw "No User ID";
                
                const { data: u, error } = await supabase
                    .from("profiles")
                    .select("username, avatar_url")
                    .eq("id", data.userid)
                    .single();
                
                if (u === null) throw "No Data on User";
                return u
            } catch (e) {
                throw e;
            }
        })();


        const [video_url, thumbnail_url, avatar_url] = await Promise.all([
            supabase.storage.from("videos").createSignedUrl(data.video_path || "", time_allowed).then(({data}) => data && data.signedUrl),
            supabase.storage.from("images").createSignedUrl(data.thumbnail_path || "", time_allowed).then(({data}) => data && data.signedUrl),
            user.avatar_url && supabase.storage.from("images").createSignedUrl(user.avatar_url, time_allowed).then(({data}) => data && data.signedUrl),
        ]);
    
        return {
            id: data.video_id,
            creator_id: data.userid || "",
            username: user.username,
            title: data.title,
            description: data.description || "",
            category: data.category,
            views: data.views || 0,
            created_at: data.created_at,
            uploadDate: (new Date(data.created_at)).toDateString(),
            video: video_url || "",
            thumbnail:  thumbnail_url || placeholder,
            avatar_url: avatar_url,
            visibility: data.visibility,
        } satisfies VideoInfoProps
    } catch (e) {
        throw e;
    }

}