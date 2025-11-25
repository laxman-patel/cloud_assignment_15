terraform {
  required_providers {
    confluent = {
      source  = "confluentinc/confluent"
      version = "1.51.0"
    }
  }
}

provider "confluent" {
  # Credentials via env vars
}

resource "confluent_environment" "development" {
  display_name = "Development"
}

resource "confluent_kafka_cluster" "basic" {
  display_name = "basic_kafka_cluster"
  availability = "SINGLE_ZONE"
  cloud        = "AWS"
  region       = "us-east-1"
  basic {}
  environment {
    id = confluent_environment.development.id
  }
}

resource "confluent_kafka_topic" "appointments" {
  kafka_cluster {
    id = confluent_kafka_cluster.basic.id
  }
  topic_name       = "appointment-events"
  partitions_count = 1
  rest_endpoint    = confluent_kafka_cluster.basic.rest_endpoint
  credentials {
    key    = "API_KEY"
    secret = "API_SECRET"
  }
}

resource "confluent_kafka_topic" "analytics" {
  kafka_cluster {
    id = confluent_kafka_cluster.basic.id
  }
  topic_name       = "analytics-results"
  partitions_count = 1
  rest_endpoint    = confluent_kafka_cluster.basic.rest_endpoint
  credentials {
    key    = "API_KEY"
    secret = "API_SECRET"
  }
}
