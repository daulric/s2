"use server"

import { createClient } from "@/lib/supabase/server"
import converttoVideo, { VideoInfoProps } from "@/lib/videos/data-to-video-format";
import { SupabaseClient } from "@supabase/supabase-js";

export async function GetVideoDetails(id: string, time_allowed: number = 30): Promise<VideoInfoProps | null> {
    const supabase = (await createClient()) as SupabaseClient;
    const { data: {user} } = await supabase.auth.getUser();

    const {data, error} = await supabase
        .from("videos")
        .select("*")
        .eq("video_id", id)
        .single();

    if (error) return null;

    const return_data = await converttoVideo(supabase, data, time_allowed, false);

    if (user && data.visibility === "private" && data.userid !== user.id) return null;
    return return_data;
}

export async function GetPublicVideos(time_allowed = 30, limit?: number) {
    const supabase = (await createClient()) as SupabaseClient;

    let query = supabase
        .from("videos")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) return null;

    const public_videos = await Promise.all(data.map((i) => ( converttoVideo(supabase, i, time_allowed) )));
    return public_videos;
}

export async function GetUserVideos(userId: string, limit = 5, time_allowed = 30): Promise<VideoInfoProps[]> {
    const supabase = (await createClient()) as SupabaseClient;

    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("userid", userId)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !data) return [];
    return await Promise.all(data.map((i) => converttoVideo(supabase, i, time_allowed)));
}

export async function GetSubscriptionVideos(userId: string, limit = 5, time_allowed = 30): Promise<VideoInfoProps[]> {
    const supabase = (await createClient()) as SupabaseClient;

    const { data: subs, error: subError } = await supabase
        .from("subscribers")
        .select("vendor")
        .eq("subscriber", userId)
        .eq("is_subscribed", true);

    if (subError || !subs || subs.length === 0) return [];

    const vendorIds = subs.map((s) => s.vendor);

    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("visibility", "public")
        .in("userid", vendorIds)
        .order("created_at", { ascending: false })
        .limit(limit);

    if (error || !data) return [];
    return await Promise.all(data.map((i) => converttoVideo(supabase, i, time_allowed)));
}

/** Limited queries + conversion — avoids loading every public video on the watch page. */
export async function GetVideoSidebarVideos(
    excludeVideoId: string,
    time_allowed = 30
): Promise<{ trending: VideoInfoProps[]; newest: VideoInfoProps[] }> {
    const supabase = (await createClient()) as SupabaseClient;
    const empty = { trending: [] as VideoInfoProps[], newest: [] as VideoInfoProps[] };

    const [trendingRes, newestRes] = await Promise.all([
        supabase
            .from("videos")
            .select("*")
            .eq("visibility", "public")
            .order("views", { ascending: false })
            .limit(48),
        supabase
            .from("videos")
            .select("*")
            .eq("visibility", "public")
            .order("created_at", { ascending: false })
            .limit(24),
    ]);

    if (trendingRes.error || newestRes.error || !trendingRes.data || !newestRes.data) {
        return empty;
    }

    const [trendingConverted, newestConverted] = await Promise.all([
        Promise.all(trendingRes.data.map((i) => converttoVideo(supabase, i, time_allowed))),
        Promise.all(newestRes.data.map((i) => converttoVideo(supabase, i, time_allowed))),
    ]);

    return {
        trending: trendingConverted.filter((v) => v.id !== excludeVideoId).slice(0, 4),
        newest: newestConverted.filter((v) => v.id !== excludeVideoId).slice(0, 8),
    };
}