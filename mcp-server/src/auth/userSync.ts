import { supabase } from '../db/client'

/**
 * Gets Supabase user ID from Auth0 user ID
 * Auth0 Actions (Post-User-Registration and Post-Login) have already:
 * 1. Verified the email exists in Supabase
 * 2. Stored the auth0_user_id in the users table
 * 
 * So we just need to find the user by auth0_user_id
 * 
 * @param auth0Sub - Auth0 user subject (e.g., "auth0|123456" or "google-oauth2|123456")
 * @returns Supabase user ID (UUID) or null if not found
 */
export async function getSupabaseUserIdFromAuth0(
  auth0Sub: string,
): Promise<string | null> {
  try {
    // Find user by auth0_user_id (set by Auth0 Actions)
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, auth0_user_id')
      .eq('auth0_user_id', auth0Sub)
      .maybeSingle()

    if (error) {
      console.error('Error finding user by auth0_user_id:', error)
      return null
    }

    if (!user) {
      console.error(`User with auth0_user_id ${auth0Sub} not found in Supabase`)
      return null
    }

    console.log(`Found Supabase user for Auth0 user ${auth0Sub}: ${user.id}`)
    return user.id
  } catch (error) {
    console.error('Unexpected error getting Supabase user from Auth0:', error)
    return null
  }
}

