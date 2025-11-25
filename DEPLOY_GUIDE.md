Zero-to-Hero Deployment Guide
This guide details every step required to deploy the Multi-Cloud Healthcare Application from scratch.

Phase 1: Prerequisites & Setup
Install CLI Tools:

Bun: curl -fsSL https://bun.sh/install | bash
Terraform: Install Guide
AWS CLI: aws configure (Enter your Access Key, Secret Key, Region: us-east-1)
Google Cloud CLI: gcloud auth login & gcloud config set project <your-project-id>
Kubectl: Install Guide
Docker: Ensure Docker Desktop or Daemon is running.
Clone Repository:

git clone <your-repo-url>
cd cloud-assignment-15
Phase 2: Infrastructure Provisioning (Terraform)
We will provision the cloud resources first so we have the Database URLs and Cluster endpoints.

AWS Infrastructure:

cd infrastructure/aws
terraform init
terraform apply -auto-approve
Note down the outputs: rds_endpoint, ecr_repository_urls, eks_cluster_name.
GCP Infrastructure:

cd ../gcp
terraform init
terraform apply -auto-approve
Note down: dataproc_cluster_name.
Confluent Cloud (Kafka):

cd ../confluent
# Export your Confluent Cloud credentials first
export CONFLUENT_CLOUD_API_KEY="<your-key>"
export CONFLUENT_CLOUD_API_SECRET="<your-secret>"
terraform init
terraform apply -auto-approve
Note down: kafka_bootstrap_servers, api_key, api_secret.
Phase 3: Build & Push Docker Images
You need to build the images and push them to the ECR repositories created by Terraform.

Login to ECR:

aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com
Build & Push Loop: Run this for auth-service, patient-service, appointment-service, and billing-service.

# Example for Auth Service
cd auth-service
docker build -t auth-service .
docker tag auth-service:latest <your-ecr-url>/auth-service:latest
docker push <your-ecr-url>/auth-service:latest
cd ..
Phase 4: Kubernetes Configuration
Connect to EKS:

aws eks update-kubeconfig --region us-east-1 --name healthcare-cluster
Configure Secrets:

Copy the template: cp k8s/secrets-template.yaml k8s/secrets.yaml
Edit k8s/secrets.yaml: Fill in the real values you noted down in Phase 2 (RDS endpoint, Kafka creds, AWS keys).
Apply it:
kubectl apply -f k8s/secrets.yaml
Update Manifests:

Edit 

k8s/deployments.yaml
: Replace image: my-registry/... with your actual ECR image URLs (e.g., <account-id>.dkr.ecr.us-east-1.amazonaws.com/auth-service:latest).
Phase 5: Deploying with ArgoCD
Install ArgoCD:

kubectl create namespace argocd
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
Access ArgoCD UI (Optional but recommended):

Get password: kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d
Port forward: kubectl port-forward svc/argocd-server -n argocd 8080:443
Login at https://localhost:8080 (User: admin).
Deploy Application:

Edit 

k8s/argocd-app.yaml
: Update repoURL to your GitHub repository.
Apply the manifest:
kubectl apply -f k8s/argocd-app.yaml
ArgoCD will now sync your Git repo to the cluster.
Phase 6: Deploying Serverless & Analytics
Deploy Lambda (Lab Result Processor):

Zip the code: cd lab-result-func && zip -r function.zip .
Update Lambda code:
aws lambda update-function-code --function-name lab_result_processor --zip-file fileb://function.zip
Deploy Flink Job (Analytics):

Upload 

job.py
 to the Dataproc cluster or a GCS bucket.
Submit the job:
gcloud dataproc jobs submit pyflink job.py --cluster=analytics-cluster --region=us-central1
Phase 7: Verification
Port Forward Frontend: Since we didn't set up a LoadBalancer Ingress (to save cost), use port-forwarding:

# Assuming you deployed the frontend to K8s, OR run it locally:
cd web-portal && pnpm dev
Test the Flow:

Open http://localhost:5173.
Register/Login: Hits auth-service.
Create Patient: Hits patient-service (DynamoDB).
Book Appointment: Hits appointment-service -> Kafka.
Check Logs:
kubectl logs -l app=billing-service
You should see "Invoice generated".
Check Analytics: The Flink job should be outputting results to the analytics-results topic.
Phase 8: Cleanup (Important!)
To avoid cloud bills:

kubectl delete -f k8s/argocd-app.yaml
cd infrastructure/aws && terraform destroy -auto-approve
cd ../gcp && terraform destroy -auto-approve
cd ../confluent && terraform destroy -auto-approve