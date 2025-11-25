provider "google" {
  project = "my-healthcare-project"
  region  = "us-central1"
}

resource "google_compute_network" "vpc_network" {
  name = "healthcare-vpc"
}

# Dataproc Cluster
resource "google_dataproc_cluster" "mycluster" {
  name   = "analytics-cluster"
  region = "us-central1"

  cluster_config {
    master_config {
      num_instances = 1
      machine_type  = "n1-standard-2"
    }

    worker_config {
      num_instances = 2
      machine_type  = "n1-standard-2"
    }

    software_config {
      image_version       = "2.0-debian10"
      optional_components = ["FLINK"]
    }
  }
}
