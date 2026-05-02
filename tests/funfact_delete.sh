#!/bin/bash

STATE_CODE=${1:-AK}

echo "Testing DELETE /states/$STATE_CODE/funfact"
echo "=========================================="

curl -X DELETE "http://localhost:8000/states/$STATE_CODE/funfact" \
  -H "Content-Type: application/json" \
  -d @funfact_delete.json

echo -e "\n"
