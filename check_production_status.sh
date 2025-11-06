#!/bin/bash
# =====================================================
# SonicBoost Production Status Check
# =====================================================

echo "🔍 SONICBOOST PRODUCTION STATUS CHECK"
echo "======================================"
echo ""

# 1. Backend Health
echo "1️⃣ Backend Health:"
HEALTH=$(curl -s -w "\n%{http_code}" https://sonicboost-backend.onrender.com/health)
if echo "$HEALTH" | tail -1 | grep -q "200"; then
  echo "   ✅ Backend is healthy"
else
  echo "   ❌ Backend health check failed"
fi
echo ""

# 2. Check env files
echo "2️⃣ Environment Configuration:"
if [ -f ".env" ]; then
  BACKEND_URL=$(grep "EXPO_PUBLIC_VIBECODE_BACKEND_URL" .env | cut -d'=' -f2)
  echo "   Backend URL: $BACKEND_URL"
  
  if echo "$BACKEND_URL" | grep -q "sonicboost-backend.onrender.com"; then
    echo "   ✅ Using production backend"
  else
    echo "   ⚠️  Not using production backend URL"
  fi
else
  echo "   ❌ .env file not found"
fi
echo ""

# 3. Check assets
echo "3️⃣ App Assets:"
if [ -f "assets/icon.png" ]; then
  ICON_SIZE=$(ls -lh assets/icon.png | awk '{print $5}')
  echo "   ✅ Icon exists ($ICON_SIZE)"
else
  echo "   ❌ Icon missing"
fi

if [ -f "assets/splash.png" ]; then
  SPLASH_SIZE=$(ls -lh assets/splash.png | awk '{print $5}')
  echo "   ✅ Splash screen exists ($SPLASH_SIZE)"
else
  echo "   ❌ Splash screen missing"
fi
echo ""

# 4. Check app.json
echo "4️⃣ App Configuration:"
if grep -q '"icon": "./assets/icon.png"' app.json; then
  echo "   ✅ Icon configured in app.json"
else
  echo "   ⚠️  Icon not configured"
fi

if grep -q 'NSMicrophoneUsageDescription' app.json; then
  echo "   ✅ Privacy strings configured"
else
  echo "   ⚠️  Privacy strings missing"
fi
echo ""

# 5. Backend endpoints test
echo "5️⃣ Testing Backend Endpoints:"
echo "   Testing /health..."
curl -s https://sonicboost-backend.onrender.com/health > /dev/null && echo "   ✅ Health endpoint OK" || echo "   ❌ Health endpoint failed"

echo ""
echo "======================================"
echo "📋 SUMMARY"
echo "======================================"
echo ""
echo "Ready for App Store: Check items above"
echo "If all show ✅, you're ready to build!"
echo ""
echo "Next steps:"
echo "  1. Test one-time payment on device"
echo "  2. Build with: npx eas build --platform ios"
echo "  3. Submit to TestFlight"
echo ""
