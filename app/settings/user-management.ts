"use server"

import { createClient } from "../../lib/supabase/server"

export async function deleteAccount(confirmation: string) {
    const supabase = await createClient()

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
        console.error("Error fetching user:", userError)
        throw userError
    }

    if (!user) {
        throw new Error("No user is currently logged in")
    }

    if (confirmation !== "DELETE") {
        throw new Error("Invalid confirmation string. Please type 'DELETE' to confirm account deletion.")
    }

    try {
        // Finally, delete the auth user
        const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

        if (authError) {
            console.error("Error deleting auth user:", authError)
            throw authError
        }
    
        await supabase.auth.signOut();
        return { success: true, message: "Account deleted successfully" }
    } catch (error) {
        console.error("An error occurred while deleting the account:", error)
        throw error
    }
}