# 🚀 Zero-to-Hero Deployment Guide

Welcome to the **Multi-Cloud Healthcare Application** deployment guide. This document details every step required to deploy the system from scratch, covering Local Development, Infrastructure Provisioning (AWS/GCP/Confluent), Kubernetes, and GitOps.

---

## 📋 Phase 1: Prerequisites & Setup

Before we begin, ensure you have the following tools installed and accounts set up.

### 🛠️ CLI Tools
| Tool | Command to Install | Purpose |
| :--- | :--- | :--- |
| **Bun** | `curl -fsSL https://bun.sh/install | bash` | JavaScript Runtime |
| **Terraform** | [Install Guide](https://developer.hashicorp.com/terraform/downloads) | Infrastructure as Code |
| **AWS CLI** | `aws configure` | Manage AWS Resources |
| **Google Cloud CLI** | `gcloud auth login` | Manage GCP Resources |
| **Kubectl** | [Install Guide](https://kubernetes.io/docs/tasks/tools/) | Control K8s Cluster |
| **Docker** | [Install Desktop](https://www.docker.com/products/docker-desktop/) | Build Container Images |

### ☁️ Cloud Accounts
1.  **AWS Account**: Ensure you have an IAM user with `AdministratorAccess`.
2.  **GCP Account**: Create a project and enable billing.
3.  **Confluent Cloud**: Create a free account for Kafka.

### 📥 Clone Repository
```bash
git clone <your-repo-url>
cd cloud-assignment-15
```

---

## 💻 Phase 2: Local Development (Optional)

Run the application locally to verify logic before deploying.

### 1. Setup Environment Variables
Create a `.env` file in each service directory (`auth-service`, `patient-service`, etc.).

**Example `.env` for Auth/Appointment/Billing:**
```env
DB_HOST=localhost
DB_USER=postgres
DB_PASSWORD=password
DB_NAME=auth_db
JWT_SECRET=local-secret
```

### 2. Run Services
Open separate terminals for each service:

```bash
# Terminal 1: Auth Service
cd auth-service && bun install && bun run index.ts

# Terminal 2: Patient Service
cd patient-service && bun install && bun run index.ts

# Terminal 3: Appointment Service
cd appointment-service && bun install && bun run index.ts

# Terminal 4: Billing Service
cd billing-service && bun install && bun run index.ts

# Terminal 5: Frontend
cd web-portal && pnpm install && pnpm dev
```

Visit `http://localhost:5173` to test the UI.

---

## 🏗️ Phase 3: Infrastructure Provisioning

We use **Terraform** to create the cloud resources.

### 1. AWS Infrastructure (Provider A)
Provisions EKS, RDS, DynamoDB, S3, and ECR.

```bash
cd infrastructure/aws
terraform init
terraform apply -auto-approve
```
📝 **Save these outputs:**
*   `rds_endpoint`
*   `ecr_repository_urls`
*   `eks_cluster_name`

### 2. GCP Infrastructure (Provider B)
Provisions Dataproc for Analytics.

```bash
cd ../gcp
terraform init
terraform apply -auto-approve
```
📝 **Save output:** `dataproc_cluster_name`

### 3. Confluent Cloud (Kafka)
Provisions Kafka Cluster and Topics.

```bash
cd ../confluent
export CONFLUENT_CLOUD_API_KEY="<your-key>"
export CONFLUENT_CLOUD_API_SECRET="<your-secret>"
terraform init
terraform apply -auto-approve
```
📝 **Save outputs:** `kafka_bootstrap_servers`, `api_key`, `api_secret`

---

## 🐳 Phase 4: Build & Push Docker Images

Build the microservices and push them to AWS ECR.

### 1. Login to ECR
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com
```

### 2. Build & Push
Repeat for `auth-service`, `patient-service`, `appointment-service`, `billing-service`.

```bash
# Example: Auth Service
cd auth-service
docker build -t auth-service .
docker tag auth-service:latest <your-ecr-url>/auth-service:latest
docker push <your-ecr-url>/auth-service:latest
cd ..
```

---

## ☸️ Phase 5: Kubernetes Configuration

### 1. Connect to EKS
```bash
aws eks update-kubeconfig --region us-east-1 --name healthcare-cluster
```

### 2. Configure Secrets
Create the `k8s/secrets.yaml` file using the template.

```bash
cp k8s/secrets-template.yaml k8s/secrets.yaml
# Edit k8s/secrets.yaml with the values saved in Phase 3
kubectl apply -f k8s/secrets.yaml
```

### 3. Update Manifests
Edit `k8s/deployments.yaml` and replace `image: my-registry/...` with your actual ECR image URLs.

---

## 🐙 Phase 6: GitOps Deployment (ArgoCD)

### 1. Install ArgoCD
```bash
kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

### 2. Access UI
```bash
# Get Admin Password
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

# Port Forward
kubectl port-forward svc/argocd-server -n argocd 8080:443
```
Login at `https://localhost:8080` (User: `admin`).

### 3. Deploy App
Update `k8s/argocd-app.yaml` with your GitHub Repo URL.

```bash
kubectl apply -f k8s/argocd-app.yaml
```
ArgoCD will automatically sync and deploy your application!

---

## ⚡ Phase 7: Serverless & Analytics

### 1. Deploy Lambda (Lab Processor)
```bash
cd lab-result-func
zip -r function.zip .
aws lambda update-function-code --function-name lab_result_processor --zip-file fileb://function.zip
```

### 2. Deploy Flink Job (Analytics)
```bash
# Upload job.py to Dataproc
gcloud dataproc jobs submit pyflink job.py --cluster=analytics-cluster --region=us-central1
```

---

## ✅ Phase 8: Verification

1.  **Frontend**: Port-forward (`cd web-portal && pnpm dev`) and visit `http://localhost:5173`.
2.  **Test Flow**: Register -> Create Patient -> Book Appointment.
3.  **Verify Logs**: `kubectl logs -l app=billing-service` (Should show invoice generation).
4.  **Verify Analytics**: Check Kafka topic `analytics-results`.

---

## 🧹 Phase 9: Cleanup

**⚠️ IMPORTANT: Destroy resources to avoid costs.**

```bash
kubectl delete -f k8s/argocd-app.yaml
cd infrastructure/aws && terraform destroy -auto-approve
cd ../gcp && terraform destroy -auto-approve
cd ../confluent && terraform destroy -auto-approve
```
