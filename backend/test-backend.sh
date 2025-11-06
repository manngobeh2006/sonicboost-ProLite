#!/bin/bash
# Simple Backend Test Script

echo "🧪 Testing SonicBoost Backend..."
echo ""

# Test 1: Health Check
echo "1️⃣ Testing health endpoint..."
HEALTH=$(curl -s http://localhost:3000/health)
if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed"
    echo "Response: $HEALTH"
fi
echo ""

# Test 2: Rate Limiting (try 6 failed logins)
echo "2️⃣ Testing rate limiting (should block after 5 attempts)..."
for i in {1..6}; do
    RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/login \
      -H "Content-Type: application/json" \
      -d '{"email":"test@test.com","password":"wrong"}')
    
    if echo "$RESPONSE" | grep -q "Too many"; then
        echo "✅ Rate limiting working (blocked at attempt $i)"
        break
    else
        echo "Attempt $i: ${RESPONSE:0:50}..."
    fi
done
echo ""

# Test 3: Password Strength
echo "3️⃣ Testing password strength validation..."
WEAK_PASS=$(curl -s -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"weak","name":"Test"}')

if echo "$WEAK_PASS" | grep -q "8 characters"; then
    echo "✅ Password validation working"
else
    echo "Response: ${WEAK_PASS:0:100}"
fi
echo ""

# Test 4: Stripe Integration
echo "4️⃣ Checking Stripe configuration..."
if [ ! -z "$STRIPE_SECRET_KEY" ]; then
    echo "✅ Stripe key configured"
else
    echo "⚠️  Stripe key not in environment (check .env)"
fi
echo ""

echo "✅ Backend tests complete!"
