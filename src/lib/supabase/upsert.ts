import { SupabaseClient } from "@supabase/supabase-js";

// This is a custom upsert where the user checks to see if a current data exisit and update it or insert the data
// The supabase upsert method doesn't do this.

export default async function upsert(supabase: SupabaseClient<any, string, any>, table: string, key: object, newData: object) {
    // newData: fields to update or insert

    // 1. Check if row exists
    const { data: existingData, error: selectError } = await supabase
      .from(table)
      .select("*")
      .match(key)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      // PGRST116 = "No rows found" error is expected if no data exists
      throw selectError;
    }

    if (existingData) {
      // 2. Update existing row
      const { data, error } = await supabase
        .from(table)
        .update(newData)
        .match(key);

      if (error) throw error;
      return data;
    } else {
      // 3. Insert new row (merge key and newData)
      const insertData = { ...key, ...newData };
      const { data, error } = await supabase.from(table).insert(insertData);
      if (error) throw error;
      return data;
    }
}