provider "aws" {
  region = "us-east-1"
}

resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  tags = {
    Name = "healthcare-vpc"
  }
}

resource "aws_subnet" "public" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = "us-east-1a"
}

resource "aws_subnet" "private" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "us-east-1b" # Changed to different AZ
}

# --- EKS IAM Role ---
resource "aws_iam_role" "eks_cluster_role" {
  name = "healthcare-eks-cluster-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "eks.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_cluster_role.name
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "healthcare-cluster"
  role_arn = aws_iam_role.eks_cluster_role.arn

  vpc_config {
    subnet_ids = [aws_subnet.public.id, aws_subnet.private.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_cluster_policy
  ]
}

# RDS (PostgreSQL)
resource "aws_db_instance" "default" {
  allocated_storage   = 20
  storage_type        = "gp3" # Changed from gp2 to gp3 for better performance
  engine              = "postgres"
  engine_version      = "16.11" # Updated to latest stable version
  instance_class      = "db.t3.micro"
  db_name             = "healthcare_db"
  username            = "postgres"
  password            = "password" # Use AWS Secrets Manager in production!
  skip_final_snapshot = true
}

# DynamoDB (Patients)
resource "aws_dynamodb_table" "patients" {
  name         = "patients"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "id"

  attribute {
    name = "id"
    type = "S"
  }
}

# S3 Bucket (Lab Reports)
resource "aws_s3_bucket" "lab_reports" {
  bucket = "healthcare-lab-reports-bucket-${random_id.bucket_suffix.hex}"
}

resource "random_id" "bucket_suffix" {
  byte_length = 4
}

# --- Lambda IAM Role ---
resource "aws_iam_role" "lambda_role" {
  name = "healthcare-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      },
    ]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
  role       = aws_iam_role.lambda_role.name
}

resource "aws_iam_role_policy_attachment" "lambda_s3_access" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess"
  role       = aws_iam_role.lambda_role.name
}

# Zip the Lambda Code
data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "../../lab-result-func"
  output_path = "${path.module}/lab_processor.zip"
  excludes    = ["node_modules", ".git", "package-lock.json"]
}

# Lambda Function (Lab Result Processor)
resource "aws_lambda_function" "lab_processor" {
  filename         = data.archive_file.lambda_zip.output_path
  function_name    = "lab_result_processor"
  role             = aws_iam_role.lambda_role.arn
  handler          = "index.handler"
  runtime          = "nodejs18.x"
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256
}
