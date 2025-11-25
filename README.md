# Multi-Cloud Healthcare Application - Design Document

## 1. System Overview
The **Multi-Cloud Healthcare Application** is a distributed, cloud-native system designed to manage patient records, appointment scheduling, billing, and real-time analytics. The system leverages a microservices architecture deployed across **AWS (Amazon Web Services)** and **GCP (Google Cloud Platform)**, connected via **Confluent Cloud (Kafka)**.

This architecture ensures high availability, scalability, and the ability to leverage specific strengths of different cloud providers (e.g., AWS for general compute/database, GCP for big data analytics).

## 2. Cloud Deployment Architecture

The system uses a **Hybrid Multi-Cloud Strategy**:

### **Provider A: AWS (Primary Workload)**
*   **EKS (Elastic Kubernetes Service)**: Hosts the stateless microservices (Auth, Patient, Appointment, Billing) and the Frontend.
*   **RDS (Relational Database Service)**: Managed PostgreSQL for structured data (User accounts, Appointments, Invoices).
*   **DynamoDB**: Managed NoSQL database for high-throughput patient records.
*   **S3 (Simple Storage Service)**: Object storage for raw lab reports (PDFs).
*   **Lambda**: Serverless compute for event-driven processing of uploaded lab reports.

### **Provider B: GCP (Analytics Workload)**
*   **Cloud Dataproc**: Managed Hadoop/Spark/Flink cluster hosting the **Analytics Service**. This service processes real-time data streams to generate insights (e.g., appointment trends).

### **Interconnection: Confluent Cloud**
*   **Managed Kafka**: Acts as the central nervous system, decoupling the AWS and GCP environments. It streams events (e.g., `AppointmentCreated`) from AWS services to the GCP Analytics Service and other consumers.

## 3. Microservices Architecture Diagram

```mermaid
graph TD
    subgraph "Client"
        Web[Web Portal (React/Vite)]
    end

    subgraph "AWS (Provider A)"
        subgraph "EKS Cluster"
            Auth[Auth Service]
            Patient[Patient Service]
            Appt[Appointment Service]
            Bill[Billing Service]
        end
        
        subgraph "Data Layer"
            RDS[(RDS PostgreSQL)]
            DDB[(DynamoDB)]
            S3[(S3 Bucket)]
        end

        subgraph "Serverless"
            Lambda[Lab Result Processor]
        end
    end

    subgraph "Confluent Cloud"
        Kafka{{Kafka Cluster}}
    end

    subgraph "GCP (Provider B)"
        subgraph "Dataproc"
            Flink[Analytics Service (Flink)]
        end
    end

    %% Interactions
    Web -->|REST/HTTPS| Auth
    Web -->|REST/HTTPS| Patient
    Web -->|REST/HTTPS| Appt
    
    Auth --> RDS
    Patient --> DDB
    Appt --> RDS
    Bill --> RDS

    Appt -->|Produces 'AppointmentCreated'| Kafka
    Kafka -->|Consumes events| Bill
    Kafka -->|Consumes events| Flink
    
    Flink -->|Produces 'AnalyticsResults'| Kafka

    Client -->|Uploads PDF| S3
    S3 -->|Triggers| Lambda
    Lambda -->|Updates| Patient
```

## 4. Microservice Responsibilities

| Service | Type | Tech Stack | Responsibility | Data Store |
| :--- | :--- | :--- | :--- | :--- |
| **Auth Service** | Microservice | Bun, Hono | User registration, authentication, JWT issuance. | AWS RDS (PostgreSQL) |
| **Patient Service** | Microservice | Bun, Hono | Management of patient profiles and medical history. | AWS DynamoDB |
| **Appointment Service** | Microservice | Bun, Hono | Scheduling appointments. Publishes events to Kafka. | AWS RDS (PostgreSQL) |
| **Billing Service** | Microservice | Bun, Hono | Generates invoices based on appointment events. | AWS RDS (PostgreSQL) |
| **Lab Result Processor** | Serverless | AWS Lambda, Node.js | Processes uploaded lab report PDFs from S3. | S3 (Source), Patient Service (Target) |
| **Analytics Service** | Data Job | Apache Flink (PyFlink) | Real-time aggregation of appointment data (e.g., count per minute). | Kafka (Source & Sink) |
| **Web Portal** | Frontend | React, Vite, Tailwind | User interface for patients and doctors. | N/A |

## 5. Interconnection Mechanisms

### **Synchronous Communication (REST)**
*   **Frontend to Backend**: The Web Portal communicates with the microservices (Auth, Patient, Appointment) using standard RESTful APIs over HTTPS.
*   **Service to Service**: Direct synchronous calls are minimized to reduce coupling, but where necessary (e.g., Lambda calling Patient Service), REST is used.

### **Asynchronous Communication (Event Streaming)**
*   **Kafka (Confluent Cloud)**: Used for critical business logic decoupling.
    *   **Producer**: `Appointment Service` publishes an event when an appointment is booked.
    *   **Consumers**: 
        *   `Billing Service` consumes this event to generate an invoice asynchronously.
        *   `Analytics Service` (on GCP) consumes this event to update real-time dashboards.
    *   **Cross-Cloud Bridge**: Kafka serves as the bridge between AWS and GCP, ensuring that network latency or downtime in one cloud does not immediately halt processes in the other.

### **Event-Driven (Serverless)**
*   **S3 Event Notifications**: Uploading a file to the S3 bucket triggers the `Lab Result Processor` Lambda function. This is a purely event-driven pattern ideal for sporadic file processing tasks.

## 6. Rationale Behind Design Choices

### **1. Polyglot Persistence (SQL + NoSQL)**
*   **RDS (SQL)**: Used for `Auth`, `Appointment`, and `Billing` because these domains require strong consistency, relational integrity (ACID transactions), and structured schemas.
*   **DynamoDB (NoSQL)**: Used for `Patient Service` to handle potentially unstructured medical data and to provide single-digit millisecond latency at any scale, which is critical for patient record retrieval.

### **2. Bun & Hono**
*   **Performance**: Bun is a modern JavaScript runtime that is significantly faster than Node.js. Hono is an ultrafast web framework designed for edge and serverless environments.
*   **Developer Experience**: Native TypeScript support in Bun eliminates the need for complex build steps during development.

### **3. Apache Flink on GCP**
*   **Stateful Stream Processing**: Flink was chosen over simple consumers because the requirement involved "time-windowed aggregation" (e.g., count per minute). Flink handles windowing, watermarks, and state management out-of-the-box.
*   **Multi-Cloud Demonstration**: Running this on GCP demonstrates the system's ability to span multiple cloud providers, preventing vendor lock-in for specific capabilities (like analytics).

### **4. Infrastructure as Code (Terraform)**
*   **Unified Management**: Terraform allows us to define resources for AWS, GCP, and Confluent Cloud in a single language (HCL), ensuring consistency and enabling reproducible environments.

### **5. GitOps (ArgoCD)**
*   **Automated Deployment**: ArgoCD ensures that the state of the Kubernetes cluster always matches the configuration in the Git repository. This eliminates "configuration drift" and provides a clear audit trail of changes.
