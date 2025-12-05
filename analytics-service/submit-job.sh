#!/bin/bash
set -e

PROJECT_ID="cc-project-479109"
REGION="us-central1"
CLUSTER_NAME="analytics-cluster"
BUCKET_NAME="clickstream-flink-jobs-${PROJECT_ID}"

JOB_FILE="job.py"
CONNECTOR_JAR="flink-sql-connector-kafka_2.11-1.12.0.jar"

echo "Detecting zone..."
ZONE=$(gcloud dataproc clusters describe "$CLUSTER_NAME" \
  --region="$REGION" \
  --format="value(config.gceClusterConfig.zoneUri)" | awk -F/ '{print $NF}')

echo "Ensure bucket exists..."
if ! gsutil ls -b "gs://${BUCKET_NAME}" >/dev/null 2>&1; then
  gsutil mb -p "$PROJECT_ID" -l "$REGION" "gs://${BUCKET_NAME}"
fi

echo "Upload files to GCS..."
gsutil cp "$JOB_FILE" gs://${BUCKET_NAME}/jobs/
gsutil cp "$CONNECTOR_JAR" gs://${BUCKET_NAME}/jars/

echo "Copy files to cluster using IAP SSH..."
gcloud compute ssh "${CLUSTER_NAME}-m" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --tunnel-through-iap \
  --command="
    gsutil cp gs://${BUCKET_NAME}/jobs/${JOB_FILE} /tmp/${JOB_FILE} &&
    gsutil cp gs://${BUCKET_NAME}/jars/${CONNECTOR_JAR} /tmp/${CONNECTOR_JAR}
  "

echo "Run Flink job..."
gcloud compute ssh "${CLUSTER_NAME}-m" \
  --zone="$ZONE" \
  --project="$PROJECT_ID" \
  --tunnel-through-iap \
  --command="flink run -py /tmp/${JOB_FILE} -C /tmp/${CONNECTOR_JAR}"

echo "✅ PyFlink job executed"
