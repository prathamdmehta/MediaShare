#!/bin/bash
echo "Creating S3 bucket..."
awslocal s3 mb s3://mediashare-dev --region us-east-1

echo "Setting CORS policy..."
awslocal s3api put-bucket-cors --bucket mediashare-dev --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
      "AllowedOrigins": ["http://localhost:5173"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
}'
echo "CORS configured."