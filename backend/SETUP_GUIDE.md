# Quick Setup Guide for SonicBoost Backend

Follow these steps to get your backend running:

## Step 1: Create Supabase Account (5 minutes)

1. Open browser and go to: https://supabase.com
2. Click "Start your project" and sign up (free)
3. Click "New Project"
4. Fill in:
   - Name: `sonicboost-backend`
   - Database Password: (save this password!)
   - Region: Choose closest to you
5. Wait 2 minutes for project to be created

## Step 2: Get Your API Keys

1. In Supabase dashboard, click "Project Settings" (gear icon bottom left)
2. Click "API" in the sidebar
3. You'll see two things you need:
   - **Project URL** (looks like: https://xxxxx.supabase.co)
   - **service_role key** (the LONG one, not the anon key!)
4. Keep this page open - you'll need these in Step 4

## Step 3: Create Database Tables

1. In Supabase, click "SQL Editor" in left sidebar
2. Click "New Query"
3. Open the file `/home/user/workspace/backend/schema.sql` 
4. Copy ALL the SQL code from that file
5. Paste it into the Supabase SQL Editor
6. Click "Run" button
7. You should see "Success. No rows returned"

## Step 4: Configure Backend

1. Open `/home/user/workspace/backend/.env` file (create it if it doesn't exist)
2. Paste this and fill in YOUR values:

```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=your_very_long_service_role_key_here
JWT_SECRET=any_long_random_string_here
PORT=3000
NODE_ENV=development
```

3. For JWT_SECRET, you can use any long random string (or generate one)

## Step 5: Test It!

Run in terminal:
```bash
cd /home/user/workspace/backend
bun run dev
```

You should see:
```
🚀 Server running on http://localhost:3000
📊 Health check: http://localhost:3000/health
```

## Step 6: Test Authentication

Try creating an account from your app! If you still get "network request failed":
- Make sure the backend is running (you should see the 🚀 message)
- Check that your `.env` file has the correct Supabase credentials
- Make sure you ran the schema.sql in Supabase

## Need Help?

Common issues:
- **"Missing Supabase environment variables"**: Your .env file is not configured
- **"Failed to create user"**: Database tables not created (redo Step 3)
- **"Connection refused"**: Backend not running (redo Step 5)
