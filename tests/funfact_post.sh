#!/bin/bash

STATE_CODE=${1:-AK}

echo "Testing POST /states/$STATE_CODE/funfact"
echo "========================================"

curl -X POST "http://localhost:8000/states/$STATE_CODE/funfact" \
  -H "Content-Type: application/json" \
  -d @funfact_post.json

echo -e "\n"
