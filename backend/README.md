# Clickmaster ProLite Backend Server

Complete backend server with Stripe integration and PostgreSQL database for the Clickmaster ProLite mobile app.

## 🏗️ Architecture

```
Mobile App → Backend API → PostgreSQL Database
                ↓
             Stripe API
```

## 📋 Features

- ✅ User authentication (JWT-based)
- ✅ Stripe subscription management
- ✅ Usage tracking and limits
- ✅ Webhook handling for Stripe events
- ✅ PostgreSQL database
- ✅ Secure password hashing
- ✅ CORS enabled for mobile app

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Set Up Database

**Option A: Local PostgreSQL**
```bash
# Install PostgreSQL (if not installed)
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql
sudo service postgresql start

# Create database
createdb clickmaster_prolite
```

**Option B: Cloud Database (Recommended)**
- [Supabase](https://supabase.com) - Free tier available
- [Railway](https://railway.app) - Automatic PostgreSQL
- [Heroku Postgres](https://www.heroku.com/postgres) - Free tier
- [ElephantSQL](https://www.elephantsql.com) - Free tier

### 3. Configure Environment Variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/clickmaster_prolite

# Stripe (get from https://dashboard.stripe.com/apikeys)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_secret_here

# Stripe Price IDs (from your products in Stripe Dashboard)
STRIPE_PRICE_ID_PRO=price_1234567890
STRIPE_PRICE_ID_ENTERPRISE=price_0987654321

# JWT
JWT_SECRET=your_super_secret_key_change_this

# Server
PORT=3000
CLIENT_URL=exp://192.168.1.100:8081
```

### 4. Initialize Database

```bash
npm run init-db
```

This creates all necessary tables:
- `users` - User accounts
- `subscriptions` - Stripe subscriptions
- `audio_files` - Processing history

### 5. Start Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

Server will run on `http://localhost:3000`

## 🔑 API Endpoints

### Authentication

**Register User**
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionStatus": "free",
    "subscriptionTier": "free"
  }
}
```

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}

Response: Same as register
```

**Get Current User**
```http
GET /api/auth/me
Authorization: Bearer {token}

Response:
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "subscriptionStatus": "active",
    "subscriptionTier": "pro",
    "mastersThisMonth": 5
  }
}
```

### Stripe Subscriptions

**Create Checkout Session**
```http
POST /api/stripe/create-checkout-session
Authorization: Bearer {token}
Content-Type: application/json

{
  "priceId": "price_1234567890"
}

Response:
{
  "success": true,
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

**Create Portal Session**
```http
POST /api/stripe/create-portal-session
Authorization: Bearer {token}

Response:
{
  "success": true,
  "url": "https://billing.stripe.com/..."
}
```

**Get Subscription Status**
```http
GET /api/subscription/status
Authorization: Bearer {token}

Response:
{
  "success": true,
  "subscription": {
    "id": "sub_...",
    "status": "active",
    "currentPeriodEnd": "2024-02-01T00:00:00Z",
    "cancelAtPeriodEnd": false
  },
  "tier": "pro",
  "mastersThisMonth": 5
}
```

### Usage Tracking

**Check Limit**
```http
GET /api/usage/check-limit
Authorization: Bearer {token}

Response:
{
  "success": true,
  "canMaster": true,
  "used": 5,
  "limit": 50,
  "remaining": 45,
  "tier": "pro"
}
```

**Increment Usage**
```http
POST /api/usage/increment
Authorization: Bearer {token}
Content-Type: application/json

{
  "genre": "pop",
  "tempo": 120,
  "duration": 180,
  "filename": "song.mp3"
}

Response:
{
  "success": true,
  "mastersThisMonth": 6
}
```

**Get History**
```http
GET /api/usage/history
Authorization: Bearer {token}

Response:
{
  "success": true,
  "files": [
    {
      "id": "uuid",
      "original_filename": "song.mp3",
      "genre": "pop",
      "tempo": 120,
      "duration": 180,
      "status": "completed",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

### Webhooks

**Stripe Webhook**
```http
POST /api/webhook
Stripe-Signature: {signature}

Handles events:
- checkout.session.completed
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.payment_succeeded
- invoice.payment_failed
```

## 💳 Stripe Setup

### 1. Create Stripe Account
- Go to [stripe.com](https://stripe.com)
- Sign up and verify your account

### 2. Get API Keys
- Dashboard → Developers → API Keys
- Copy **Publishable key** and **Secret key**
- Add to `.env` file

### 3. Create Products

In Stripe Dashboard → Products:

**Pro Plan**
- Name: "Pro Plan"
- Description: "50 masters per month"
- Pricing: $9.99/month (recurring)
- Copy the Price ID → `STRIPE_PRICE_ID_PRO`

**Enterprise Plan**
- Name: "Enterprise Plan"
- Description: "Unlimited masters"
- Pricing: $29.99/month (recurring)
- Copy the Price ID → `STRIPE_PRICE_ID_ENTERPRISE`

### 4. Set Up Webhooks

Dashboard → Developers → Webhooks:
- Click "Add endpoint"
- URL: `https://your-backend.com/api/webhook`
- Select events:
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy Webhook signing secret → `STRIPE_WEBHOOK_SECRET`

## 🗄️ Database Schema

### Users Table
```sql
id                  UUID PRIMARY KEY
email               VARCHAR(255) UNIQUE
password_hash       VARCHAR(255)
name                VARCHAR(255)
stripe_customer_id  VARCHAR(255)
subscription_status VARCHAR(50) DEFAULT 'free'
subscription_tier   VARCHAR(50) DEFAULT 'free'
masters_this_month  INTEGER DEFAULT 0
masters_total       INTEGER DEFAULT 0
last_reset_date     DATE
created_at          TIMESTAMP
updated_at          TIMESTAMP
```

### Subscriptions Table
```sql
id                     UUID PRIMARY KEY
user_id                UUID REFERENCES users(id)
stripe_subscription_id VARCHAR(255) UNIQUE
stripe_price_id        VARCHAR(255)
status                 VARCHAR(50)
current_period_start   TIMESTAMP
current_period_end     TIMESTAMP
cancel_at_period_end   BOOLEAN
created_at             TIMESTAMP
updated_at             TIMESTAMP
```

### Audio Files Table
```sql
id                UUID PRIMARY KEY
user_id           UUID REFERENCES users(id)
original_filename VARCHAR(255)
genre             VARCHAR(50)
tempo             INTEGER
duration          NUMERIC
file_size         BIGINT
status            VARCHAR(50)
created_at        TIMESTAMP
```

## 🚀 Deployment

### Option 1: Railway (Recommended)

1. Create account at [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub"
3. Select your repository
4. Railway auto-detects Node.js and provisions PostgreSQL
5. Add environment variables in Railway dashboard
6. Deploy!

**Auto-provisions:**
- Node.js server
- PostgreSQL database
- HTTPS certificate
- Automatic deployments

### Option 2: Heroku

```bash
# Install Heroku CLI
brew install heroku

# Login
heroku login

# Create app
heroku create clickmaster-prolite-backend

# Add PostgreSQL
heroku addons:create heroku-postgresql:mini

# Set environment variables
heroku config:set STRIPE_SECRET_KEY=sk_test_...
heroku config:set JWT_SECRET=your_secret

# Deploy
git push heroku main

# Initialize database
heroku run npm run init-db
```

### Option 3: DigitalOcean

1. Create Droplet (Ubuntu)
2. Install Node.js and PostgreSQL
3. Clone repository
4. Set up environment variables
5. Use PM2 for process management
6. Configure Nginx as reverse proxy

## 🔒 Security Checklist

- ✅ Passwords hashed with bcrypt
- ✅ JWT for authentication
- ✅ Environment variables for secrets
- ✅ CORS configured
- ✅ Stripe webhook signature verification
- ✅ SQL injection protection (parameterized queries)
- ✅ Rate limiting (TODO: add in production)
- ✅ HTTPS required in production

## 🧪 Testing

### Test with curl

**Register:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

**Check Limit:**
```bash
curl -X GET http://localhost:3000/api/usage/check-limit \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Test Stripe Webhooks

Use Stripe CLI:
```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/webhook

# Trigger test events
stripe trigger checkout.session.completed
```

## 📊 Monitoring

### Logs
```bash
# View logs (production)
heroku logs --tail

# Railway
railway logs
```

### Database
```bash
# Connect to database
psql $DATABASE_URL

# Check users
SELECT id, email, subscription_tier, masters_this_month FROM users;

# Check subscriptions
SELECT * FROM subscriptions WHERE status = 'active';
```

## 🐛 Troubleshooting

**Database connection error:**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Check firewall/network settings

**Stripe webhook not working:**
- Verify webhook secret is correct
- Check webhook URL is accessible
- View webhook logs in Stripe Dashboard

**JWT token invalid:**
- Check JWT_SECRET matches
- Token may be expired (default 7 days)
- User may have been deleted

## 📚 Next Steps

1. ✅ Connect mobile app to backend
2. ✅ Test authentication flow
3. ✅ Test Stripe checkout
4. ✅ Deploy to production
5. ✅ Monitor and scale

## 🔗 Useful Links

- [Express Documentation](https://expressjs.com/)
- [Stripe API Reference](https://stripe.com/docs/api)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [JWT.io](https://jwt.io/)

## 🆘 Support

Need help? Check the troubleshooting section or create an issue in the repository.

---

**Backend is ready! Now connect your mobile app to start accepting payments! 🚀**
