# SonicBoost ProLite Backend

Backend API for SonicBoost ProLite mobile app with authentication, subscription management, and usage tracking.

## Features

- **Authentication**: JWT-based auth with bcrypt password hashing
- **Subscription Management**: Stripe integration for Pro/Unlimited plans
- **Usage Tracking**: Monitor mastering history and enforce limits
- **Database**: PostgreSQL via Supabase

## Tech Stack

- Node.js + Express + TypeScript
- Supabase (PostgreSQL)
- Stripe for payments
- JWT for authentication

## Setup Instructions

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Project Settings > API
4. Copy your **Project URL** and **service_role key** (not anon key!)

### 2. Set Up Database

1. In your Supabase project, go to SQL Editor
2. Copy the contents of `schema.sql` and run it
3. This creates the users and mastering_history tables

### 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your credentials in `.env`:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_KEY=your_service_role_key_here
   JWT_SECRET=generate_a_long_random_string_here
   ```

3. Generate a secure JWT secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

### 4. Install Dependencies

```bash
bun install
```

### 5. Run Development Server

```bash
bun run dev
```

The server will start on `http://localhost:3000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (requires auth)

### Usage
- `GET /api/usage/check-limit` - Check mastering limits
- `POST /api/usage/increment` - Increment usage count
- `GET /api/usage/history` - Get mastering history

### Subscription
- `GET /api/subscription/status` - Get subscription status

### Stripe (Optional)
- `POST /api/stripe/create-checkout-session` - Create Stripe checkout
- `POST /api/stripe/create-portal-session` - Create billing portal
- `POST /api/stripe/webhook` - Stripe webhook handler

## Stripe Setup (Optional)

If you want to enable paid subscriptions:

1. Create a [Stripe account](https://stripe.com)
2. Get your API keys from the Stripe dashboard
3. Create products and prices in Stripe
4. Add keys to `.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_UNLIMITED_PRICE_ID=price_...
   ```

## Deployment

### Option 1: Railway (Recommended)
1. Push code to GitHub
2. Go to [railway.app](https://railway.app)
3. Create new project from GitHub repo
4. Add environment variables
5. Deploy!

### Option 2: Render
1. Push code to GitHub
2. Go to [render.com](https://render.com)
3. Create new Web Service
4. Connect GitHub repo
5. Add environment variables
6. Deploy!

## Database Schema

### users
- id (UUID)
- email (string, unique)
- name (string)
- password_hash (string)
- subscription_status (string: free/active/canceled)
- subscription_tier (string: free/pro/unlimited)
- subscription_id (string, optional)
- masters_this_month (integer)
- created_at (timestamp)
- updated_at (timestamp)

### mastering_history
- id (UUID)
- user_id (UUID, foreign key)
- genre (string)
- tempo (integer)
- duration (float)
- filename (string)
- created_at (timestamp)
