import { supabase } from '../db/client'

/**
 * Syncs Auth0 user to Supabase users table
 * Returns the Supabase user ID (UUID) for the Auth0 user
 * 
 * @param auth0Sub - Auth0 user subject (e.g., "auth0|123456" or "google-oauth2|123456")
 * @param email - User's email from Auth0 token
 * @param name - User's name from Auth0 token (optional)
 * @returns Supabase user ID (UUID) or null if sync failed
 */
export async function syncAuth0UserToSupabase(
  auth0Sub: string,
  email?: string,
  name?: string,
): Promise<string | null> {
  try {
    // First, try to find existing user by email (if email is available)
    if (email) {
      const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email.toLowerCase())
        .maybeSingle()

      if (findError) {
        console.error('Error finding user by email:', findError)
      } else if (existingUser) {
        // User exists, return their Supabase ID
        console.log(`Found existing Supabase user for Auth0 user ${auth0Sub}: ${existingUser.id}`)
        return existingUser.id
      }
    }

    // User doesn't exist, create new user in Supabase
    // Use email from Auth0, or generate a placeholder if not available
    const userEmail = email || `${auth0Sub}@auth0.local`
    const userName = name || null

    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        email: userEmail.toLowerCase(),
        name: userName,
      })
      .select('id')
      .single()

    if (createError) {
      console.error('Error creating Supabase user:', createError)
      return null
    }

    console.log(`Created new Supabase user for Auth0 user ${auth0Sub}: ${newUser.id}`)
    return newUser.id
  } catch (error) {
    console.error('Unexpected error syncing Auth0 user to Supabase:', error)
    return null
  }
}

