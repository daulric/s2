"use server"

import { createClient } from "@/lib/supabase/server"
import converttoVideo from "@/lib/videos/data-to-video-format";

export async function GetVideoDetails(id, time_allowed = 10) {
    const supabase = await createClient();
    const { data: {user} } = await supabase.auth.getUser();

    const {data, error} = await supabase
        .from("videos")
        .select("*")
        .eq("video_id", id)
        .single();

    if (error) return null;

    const return_data = await converttoVideo(supabase, data, time_allowed);

    if (data.visibility === "private" && data.userid !== user.id) return null;
    return return_data;
}

export async function GetPublicVideos(time_allowed = 10) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("videos")
        .select("*")
        .eq("visibility", "public");

    if (error) return null;

    const public_videos = await Promise.all(data.map((i) => ( converttoVideo(supabase, i, time_allowed) )));
    return public_videos;
}