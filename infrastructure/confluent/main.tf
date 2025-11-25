terraform {
  required_providers {
    confluent = {
      source  = "confluentinc/confluent"
      version = "1.51.0"
    }
  }
}

provider "confluent" {
  cloud_api_key    = "U4W7QRE2EANSFYQC"
  cloud_api_secret = "cfltHgGvp1VKM1z2ohDLdjGejcm6hLGPb9kxRkkoggMzuiYAbJdxS8ktdospSpdw"
}

resource "confluent_environment" "development" {
  display_name = "Development"
}

resource "confluent_kafka_cluster" "basic" {
  display_name = "basic_kafka_cluster"
  availability = "SINGLE_ZONE"
  cloud        = "GCP"
  region       = "us-central1"
  basic {}
  environment {
    id = confluent_environment.development.id
  }
}

# Service Account for the Cluster
resource "confluent_service_account" "app_manager" {
  display_name = "app-manager"
  description  = "Service account to manage Kafka topics"
}

# Role Binding (CloudClusterAdmin)
resource "confluent_role_binding" "app_manager_kafka_cluster_admin" {
  principal   = "User:${confluent_service_account.app_manager.id}"
  role_name   = "CloudClusterAdmin"
  crn_pattern = confluent_kafka_cluster.basic.rbac_crn
}

# API Key for the Service Account
resource "confluent_api_key" "app_manager_kafka_api_key" {
  display_name = "app-manager-kafka-api-key"
  description  = "Kafka API Key that is owned by 'app-manager' service account"
  owner {
    id          = confluent_service_account.app_manager.id
    api_version = confluent_service_account.app_manager.api_version
    kind        = confluent_service_account.app_manager.kind
  }

  managed_resource {
    id          = confluent_kafka_cluster.basic.id
    api_version = confluent_kafka_cluster.basic.api_version
    kind        = confluent_kafka_cluster.basic.kind

    environment {
      id = confluent_environment.development.id
    }
  }

  # Ensure role binding exists before creating the key
  depends_on = [
    confluent_role_binding.app_manager_kafka_cluster_admin
  ]
}

resource "confluent_kafka_topic" "appointments" {
  kafka_cluster {
    id = confluent_kafka_cluster.basic.id
  }
  topic_name       = "appointment-events"
  partitions_count = 1
  rest_endpoint    = confluent_kafka_cluster.basic.rest_endpoint
  credentials {
    key    = confluent_api_key.app_manager_kafka_api_key.id
    secret = confluent_api_key.app_manager_kafka_api_key.secret
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
    key    = confluent_api_key.app_manager_kafka_api_key.id
    secret = confluent_api_key.app_manager_kafka_api_key.secret
  }
}

output "kafka_bootstrap_servers" {
  value = confluent_kafka_cluster.basic.bootstrap_endpoint
}

output "kafka_api_key" {
  value     = confluent_api_key.app_manager_kafka_api_key.id
  sensitive = true
}

output "kafka_api_secret" {
  value     = confluent_api_key.app_manager_kafka_api_key.secret
  sensitive = true
}
