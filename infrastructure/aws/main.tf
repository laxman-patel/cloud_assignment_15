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
  availability_zone = "us-east-1a"
}

# EKS Cluster
resource "aws_eks_cluster" "main" {
  name     = "healthcare-cluster"
  role_arn = "arn:aws:iam::123456789012:role/eks-role" # Placeholder

  vpc_config {
    subnet_ids = [aws_subnet.public.id, aws_subnet.private.id]
  }
}

# RDS (PostgreSQL)
resource "aws_db_instance" "default" {
  allocated_storage   = 20
  storage_type        = "gp2"
  engine              = "postgres"
  engine_version      = "13.4"
  instance_class      = "db.t3.micro"
  db_name             = "healthcare_db"
  username            = "postgres"
  password            = "password"
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
  bucket = "healthcare-lab-reports-bucket"
}

# Lambda Function (Lab Result Processor)
resource "aws_lambda_function" "lab_processor" {
  filename      = "lab_processor.zip"
  function_name = "lab_result_processor"
  role          = "arn:aws:iam::123456789012:role/lambda-role" # Placeholder
  handler       = "index.handler"
  runtime       = "nodejs18.x"
}
