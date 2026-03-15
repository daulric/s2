import { createClient } from "@/lib/supabase/client";
import { VideoProps  } from "@/components/video-card"

export default async function GetSearchVideos(search: string, time_allowed: number = 10) {
  if (!search) return null;

  try {
    const supabase = createClient();

    // Step 1: Find profiles with matching username
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id")
      .ilike("username", `%${search}%`);

    if (profilesError) throw profilesError;

    const profileIds = profiles?.map(p => p.id) || [];

    // Run parallel queries for videos matching text fields
    const [title_query, description_query, category_query] = await Promise.all([
      supabase.from("videos").select("*, profiles(username)").ilike('title', `%${search}%`),
      supabase.from("videos").select("*, profiles(username)").ilike('description', `%${search}%`),
      supabase.from("videos").select("*, profiles(username)").ilike('category', `%${search}%`),
    ]);

    // Query videos that belong to profiles matching username
    const { data: profile_videos, error: profileVideosError } = await supabase
      .from("videos")
      .select("*, profiles(username)")
      .in("userid", profileIds);

    if (title_query.error ||description_query.error || category_query.error || profileVideosError ) {
      throw (
        title_query.error ||
        description_query.error ||
        category_query.error ||
        profileVideosError
      );
    }

    // Combine all videos
    const combined = [
      ...(title_query.data || []),
      ...(description_query.data || []),
      ...(category_query.data || []),
      ...(profile_videos || []),
    ];

    // Remove duplicates by video id
    const merged = await Promise.all(
      Object.values(
        combined
          .filter(item => item.visibility === "public")
          .reduce<Record<string, typeof combined[0]>>((acc, item) => {
            acc[item.video_id] = item;
            return acc;
          }, {})
      ).map(async (item): Promise<VideoProps> => {

        const readableDate = new Date(item.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        return {
          id: item.video_id,
          title: item.title,
          thumbnail: "",
          views: item.views.toString(),
          uploadDate: readableDate,
          username: item.profiles.username,
          thumbnail_path: item.thumbnail_path,
        };
      })
    );

    return merged;
  } catch {
    return [];
  }
}