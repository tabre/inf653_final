#!/bin/bash

STATE_CODE=${1:-AK}

echo "Testing PATCH /states/$STATE_CODE/funfact"
echo "=========================================="

curl -X PATCH "http://localhost:8000/states/$STATE_CODE/funfact" \
  -H "Content-Type: application/json" \
  -d @funfact_patch.json

echo -e "\n"
