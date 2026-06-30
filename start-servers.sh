#!/bin/bash
cd /Volumes/RitikSSD/LabMentix/June\ Project/SmartERP/Project
npm run dev --workspace=apps/api > /tmp/api.log 2>&1 &
API_PID=$!
npm run dev --workspace=apps/web > /tmp/web.log 2>&1 &
WEB_PID=$!
echo "API PID: $API_PID"
echo "WEB PID: $WEB_PID"
