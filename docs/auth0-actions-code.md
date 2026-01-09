# Auth0 Actions Code

This document contains the code for Auth0 Actions that need to be added to your Auth0 tenant.

## Prerequisites

1. Get your Supabase credentials:
   - `SUPABASE_URL` - Your Supabase project URL (e.g., `https://xxxxx.supabase.co`)
   - `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key (from Settings → API)

2. Get your ContextDB web app URL:
   - `CONTEXTDB_WEB_URL` - Your web app URL (e.g., `https://contextdb-web.vercel.app`)

## Action 1: Post-User-Registration

**Purpose:** Block Auth0 registration if user doesn't have a ContextDB account, or store `auth0_user_id` if they do.

**Steps to create:**
1. Go to Auth0 Dashboard → **Actions** → **Flows**
2. Click **Post User Registration** flow
3. Click **+** to add a new Action
4. Click **Build Custom** → **Empty Action**
5. Name it: `Check ContextDB Account on Registration`
6. Paste the code below
7. Click **Deploy**

**Code:**

```javascript
/**
 * Post-User-Registration Action
 * Checks if user has a ContextDB account before allowing Auth0 registration
 */
exports.onExecutePostUserRegistration = async (event, api) => {
  const email = event.user.email;
  const auth0UserId = event.user.user_id; // e.g., "auth0|123456" or "google-oauth2|123456"
  
  // Skip check if email is Auth0-generated (shouldn't happen, but safety check)
  if (!email || email.includes('@auth0.local')) {
    api.access.deny(
      'Invalid email address. Please use the same email you used to create your ContextDB account.',
      {
        error: 'invalid_email',
        error_description: 'Email address is not valid. Please use the same email you used to create your ContextDB account.',
      }
    );
    return;
  }
  
  // Check if user exists in Supabase
  const supabaseUrl = event.secrets.SUPABASE_URL;
  const supabaseKey = event.secrets.SUPABASE_SERVICE_ROLE_KEY;
  const contextdbWebUrl = event.secrets.CONTEXTDB_WEB_URL || 'https://contextdb-web.vercel.app';
  
  try {
    // Check if user exists in Supabase by email
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,auth0_user_id`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!checkResponse.ok) {
      console.error('Error checking Supabase:', await checkResponse.text());
      api.access.deny(
        'Unable to verify account. Please try again later.',
        {
          error: 'verification_failed',
          error_description: 'Unable to verify your ContextDB account. Please try again later.',
        }
      );
      return;
    }
    
    const users = await checkResponse.json();
    
    if (!users || users.length === 0) {
      // User doesn't exist in Supabase - block registration
      api.access.deny(
        'Please create a ContextDB account first',
        {
          error: 'account_required',
          error_description: `You must create a ContextDB account before connecting Claude. Please visit ${contextdbWebUrl}/signup to create an account, then try connecting again.`,
          redirect_uri: `${contextdbWebUrl}/signup?redirect=claude`,
        }
      );
      return;
    }
    
    // User exists in Supabase
    const user = users[0];
    
    // If auth0_user_id is already set, don't override (per MVP requirements)
    if (user.auth0_user_id && user.auth0_user_id !== auth0UserId) {
      // Allow registration but don't update auth0_user_id
      console.log(`User ${email} already has auth0_user_id ${user.auth0_user_id}, not overriding`);
      return;
    }
    
    // Store auth0_user_id in Supabase (only if not already set)
    if (!user.auth0_user_id) {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            auth0_user_id: auth0UserId,
          }),
        }
      );
      
      if (!updateResponse.ok) {
        console.error('Error updating auth0_user_id:', await updateResponse.text());
        // Don't block registration if update fails - user exists, that's what matters
      } else {
        console.log(`Stored auth0_user_id ${auth0UserId} for user ${email}`);
      }
    }
    
    // Allow registration to proceed
  } catch (error) {
    console.error('Error in Post-User-Registration Action:', error);
    api.access.deny(
      'An error occurred. Please try again later.',
      {
        error: 'internal_error',
        error_description: 'An error occurred while verifying your account. Please try again later.',
      }
    );
  }
};
```

**Secrets to configure:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `CONTEXTDB_WEB_URL` - Your web app URL (optional, defaults to https://contextdb-web.vercel.app)

---

## Action 2: Post-Login

**Purpose:** Block Auth0 login if user doesn't have a ContextDB account, or store `auth0_user_id` if they do.

**Steps to create:**
1. Go to Auth0 Dashboard → **Actions** → **Flows**
2. Click **Login** flow
3. Click **+** to add a new Action
4. Click **Build Custom** → **Empty Action**
5. Name it: `Check ContextDB Account on Login`
6. Paste the code below
7. Click **Deploy**

**Code:**

```javascript
/**
 * Post-Login Action
 * Checks if user has a ContextDB account before allowing Auth0 login
 */
exports.onExecutePostLogin = async (event, api) => {
  const email = event.user.email;
  const auth0UserId = event.user.user_id; // e.g., "auth0|123456" or "google-oauth2|123456"
  
  // Skip check if email is Auth0-generated (shouldn't happen, but safety check)
  if (!email || email.includes('@auth0.local')) {
    api.access.deny(
      'Invalid email address. Please use the same email you used to create your ContextDB account.',
      {
        error: 'invalid_email',
        error_description: 'Email address is not valid. Please use the same email you used to create your ContextDB account.',
      }
    );
    return;
  }
  
  // Check if user exists in Supabase
  const supabaseUrl = event.secrets.SUPABASE_URL;
  const supabaseKey = event.secrets.SUPABASE_SERVICE_ROLE_KEY;
  const contextdbWebUrl = event.secrets.CONTEXTDB_WEB_URL || 'https://contextdb-web.vercel.app';
  
  try {
    // Check if user exists in Supabase by email
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,auth0_user_id`,
      {
        method: 'GET',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    if (!checkResponse.ok) {
      console.error('Error checking Supabase:', await checkResponse.text());
      api.access.deny(
        'Unable to verify account. Please try again later.',
        {
          error: 'verification_failed',
          error_description: 'Unable to verify your ContextDB account. Please try again later.',
        }
      );
      return;
    }
    
    const users = await checkResponse.json();
    
    if (!users || users.length === 0) {
      // User doesn't exist in Supabase - block login
      api.access.deny(
        'Please create a ContextDB account first',
        {
          error: 'account_required',
          error_description: `You must create a ContextDB account before connecting Claude. Please visit ${contextdbWebUrl}/signup to create an account, then try connecting again.`,
          redirect_uri: `${contextdbWebUrl}/signup?redirect=claude`,
        }
      );
      return;
    }
    
    // User exists in Supabase
    const user = users[0];
    
    // If auth0_user_id is already set, don't override (per MVP requirements)
    if (user.auth0_user_id && user.auth0_user_id !== auth0UserId) {
      // Allow login but don't update auth0_user_id
      console.log(`User ${email} already has auth0_user_id ${user.auth0_user_id}, not overriding`);
      return;
    }
    
    // Store auth0_user_id in Supabase (only if not already set)
    if (!user.auth0_user_id) {
      const updateResponse = await fetch(
        `${supabaseUrl}/rest/v1/users?id=eq.${user.id}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            auth0_user_id: auth0UserId,
          }),
        }
      );
      
      if (!updateResponse.ok) {
        console.error('Error updating auth0_user_id:', await updateResponse.text());
        // Don't block login if update fails - user exists, that's what matters
      } else {
        console.log(`Stored auth0_user_id ${auth0UserId} for user ${email}`);
      }
    }
    
    // Allow login to proceed
  } catch (error) {
    console.error('Error in Post-Login Action:', error);
    api.access.deny(
      'An error occurred. Please try again later.',
      {
        error: 'internal_error',
        error_description: 'An error occurred while verifying your account. Please try again later.',
      }
    );
  }
};
```

**Secrets to configure:**
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `CONTEXTDB_WEB_URL` - Your web app URL (optional, defaults to https://contextdb-web.vercel.app)

---

## Configuration Steps

1. **Create Post-User-Registration Action:**
   - Go to Actions → Flows → Post User Registration
   - Add the first action code above
   - Configure secrets (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, CONTEXTDB_WEB_URL)
   - Deploy

2. **Create Post-Login Action:**
   - Go to Actions → Flows → Login
   - Add the second action code above
   - Configure secrets (same as above)
   - Deploy

3. **Test the flow:**
   - Try registering a new user in Auth0 without a ContextDB account → should be blocked
   - Create a ContextDB account
   - Try registering/login again → should succeed and store auth0_user_id

## Notes

- Both actions check Supabase by email (case-insensitive)
- If user doesn't exist → block with error message
- If user exists → allow and store `auth0_user_id` (only if not already set)
- No override of existing `auth0_user_id` (per MVP requirements)
- Custom error pages will show the error_description to users

