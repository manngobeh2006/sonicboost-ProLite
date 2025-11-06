#!/bin/bash
# Monitor Render deployment

echo "🔄 Monitoring Render Deployment..."
echo "===================================="
echo ""

BACKEND_URL="https://sonicboost-backend.onrender.com"
MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  ATTEMPT=$((ATTEMPT + 1))
  
  echo -n "[$ATTEMPT/$MAX_ATTEMPTS] Checking backend... "
  
  RESPONSE=$(curl -s -w "\n%{http_code}" $BACKEND_URL/health 2>&1)
  HTTP_CODE=$(echo "$RESPONSE" | tail -1)
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Backend is healthy"
    
    # Check if security headers are present (new deployment)
    HEADERS=$(curl -s -I $BACKEND_URL/health 2>&1)
    
    if echo "$HEADERS" | grep -q "X-Frame-Options"; then
      echo ""
      echo "✅ DEPLOYMENT COMPLETE!"
      echo "Security headers detected - new code is live"
      echo ""
      echo "Backend is ready for testing!"
      exit 0
    else
      echo "   (Still running old code, waiting for deployment...)"
    fi
  else
    echo "⏳ Deploying... (HTTP $HTTP_CODE)"
  fi
  
  sleep 10
done

echo ""
echo "⚠️  Deployment taking longer than expected"
echo "Check Render dashboard: https://dashboard.render.com"
