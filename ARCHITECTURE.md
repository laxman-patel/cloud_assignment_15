# 🏗️ Multi-Cloud Healthcare Application - Architecture Overview

## 📌 Executive Summary

The **Multi-Cloud Healthcare Application** is a distributed, event-driven microservices system designed for managing healthcare workflows including patient records, appointments, billing, and real-time analytics. The system leverages a **hybrid multi-cloud architecture** across **AWS** and **Confluent Cloud (Kafka)**, with **Apache Flink** for stream processing.

---

## 🎯 System Architecture

### **High-Level Architecture Diagram**

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                     Web Portal (React + Vite)                    │
│              Port 80 (Nginx) - Hosted on AWS EKS                 │
└──────────────┬──────────────────────────────────────────────────┘
               │
               │ REST API (HTTPS) + WebSocket (WS)
               │
┌──────────────┴──────────────────────────────────────────────────┐
│                     API GATEWAY / SERVICES LAYER                 │
│                         AWS EKS Cluster                          │
│  ┌────────────┬────────────┬────────────┬────────────┐         │
│  │Auth Service│Patient Svc │Appt Service│Billing Svc │         │
│  │  :3000     │  :3001     │  :3002     │  :3003     │         │
│  │            │            │(WebSocket) │            │         │
│  └──────┬─────┴──────┬─────┴──────┬─────┴──────┬─────┘         │
└─────────┼────────────┼────────────┼────────────┼───────────────┘
          │            │            │            │
          ▼            ▼            ▼            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA PERSISTENCE LAYER                      │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ RDS/Postgres│  │ DynamoDB   │  │ RDS/Postgres│  │RDS/Postgres│
│  │  (Users)   │  │ (Patients) │  │(Appointments)│  │(Invoices)│ │
│  │ Auth Svc   │  │ Patient Svc│  │  Appt Svc  │  │ Bill Svc │ │
│  └────────────┘  └────────────┘  └────────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────────┘
          │                          │            │
          │                          │            │ Kafka Producer
          │                          │            ▼
          │                          │   ┌────────────────────┐
          │                          │   │ Confluent Cloud    │
          │                          │   │    Kafka Cluster   │
          │                          │   │                    │
          │                          │   │ Topics:            │
          │                          │   │ • appointment-events│
          │                          │   │ • analytics-results│
          │                          │   └─────┬────────┬─────┘
          │                          │         │        │
          │                          │         │        │ Consumer
          │                          │         │        ▼
          │                          │         │   ┌──────────────┐
          │                          │         │   │Appointment   │
          │                          │         │   │  Service     │
          │                          │         │   │ (WebSocket   │
          │                          │         │   │  Broadcast)  │
          │                          │         │   └──────────────┘
          │                          │         │
          │                          │         │ Consumer
          │                          │         ▼
          │                          │   ┌──────────────────┐
          │                          │   │ Apache Flink Job │
          │                          │   │ (Java - Flink    │
          │                          │   │  1.18.0)         │
          │                          │   │                  │
          │                          │   │ Stream Processing│
          │                          │   │ • Total Events   │
          │                          │   │ • Avg per Hour   │
          │                          │   │ • Windowing      │
          │                          │   └────────┬─────────┘
          │                          │            │
          │                          │            │ Producer
          │                          │            ▼
          │                          │   ┌────────────────────┐
          │                          │   │ analytics-results  │
          │                          │   │      (Kafka)       │
          │                          │   └────────────────────┘
          │                          │
          │ Lambda Trigger           │
          ▼                          │
┌───────────────────────┐           │
│    AWS Lambda         │           │
│ Invoice PDF Generator │           │
│   (Node.js/Bun)       │◄──────────┘ (Invoked by Billing Service)
│                       │
│  Uses:                │
│  • PDFKit             │
│  • AWS S3 SDK         │
└──────────┬────────────┘
           │
           │ Upload PDF
           ▼
┌───────────────────────┐
│     AWS S3 Bucket     │
│ healthcare-lab-reports│
│   /invoices/*.pdf     │
└───────────────────────┘
```

---

## 🧩 Service Architecture Breakdown

### **1. Auth Service** 
**Port:** `3000`  
**Technology Stack:** Bun + Hono + PostgreSQL  
**Purpose:** User authentication and authorization

#### **Responsibilities:**
- User registration with bcrypt password hashing
- User login with JWT token generation
- Token validation (JWT with 1-hour expiration)

#### **Data Storage:**
- **Database:** AWS RDS PostgreSQL
- **Table:** `users` (id, email, password_hash)

#### **API Endpoints:**
```
POST /register  - Register new user
POST /login     - Authenticate user and return JWT
GET  /          - Health check
```

#### **Environment Variables:**
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET
```

---

### **2. Patient Service**
**Port:** `3001`  
**Technology Stack:** Bun + Hono + AWS DynamoDB  
**Purpose:** Patient record management

#### **Responsibilities:**
- Create patient profiles
- Retrieve patient information
- Update patient records
- Scan all patients

#### **Data Storage:**
- **Database:** AWS DynamoDB
- **Table:** `patients`
- **Partition Key:** `id` (UUID)

#### **API Endpoints:**
```
GET    /patients      - List all patients
GET    /patients/:id  - Get patient by ID
POST   /patients      - Create new patient
PATCH  /patients/:id  - Update patient record
```

#### **Environment Variables:**
```
AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, TABLE_NAME
```

---

### **3. Appointment Service** ⭐
**Port:** `3002`  
**Technology Stack:** Bun + Hono + PostgreSQL + KafkaJS + WebSocket  
**Purpose:** Appointment scheduling and real-time analytics streaming

#### **Responsibilities:**
- Create and manage appointments
- **Publish events** to Kafka (`appointment-events` topic)
- **Consume analytics results** from Kafka (`analytics-results` topic)
- **Stream real-time analytics** to web clients via WebSocket

#### **Data Storage:**
- **Database:** AWS RDS PostgreSQL
- **Table:** `appointments` (id, patient_id, doctor_id, time)

#### **Event Architecture:**

**Producer Flow:**
```
POST /appointments 
  → Save to DB 
  → Publish to Kafka Topic: "appointment-events"
  → Payload: { event, appointmentId, patientId, doctorId, time }
```

**Consumer Flow:**
```
Kafka Topic: "analytics-results" 
  → Consumer (groupId: "appointment-service-group")
  → Broadcast via WebSocket to all connected clients
```

#### **API Endpoints:**
```
GET    /appointments      - List all appointments
POST   /appointments      - Create appointment (triggers Kafka event)
WebSocket: ws://host:3002 - Real-time analytics stream
```

#### **WebSocket Payload Example:**
```json
{
  "metricType": "AppointmentAnalytics",
  "totalEventsCreated": 150,
  "avgAppointmentsPerHour": 12.5,
  "windowStartTime": 1701234567890,
  "windowEndTime": 1701238167890,
  "timestamp": 1701238167890
}
```

#### **Environment Variables:**
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
KAFKA_BROKERS, KAFKA_SASL_USERNAME, KAFKA_SASL_PASSWORD, KAFKA_SSL
```

---

### **4. Billing Service**
**Port:** `3003`  
**Technology Stack:** Bun + Hono + PostgreSQL + KafkaJS + AWS Lambda Client  
**Purpose:** Invoice generation and management

#### **Responsibilities:**
- **Consume appointment events** from Kafka
- Generate invoices with Lambda-generated PDFs
- Track invoice payment status
- Store invoice metadata with PDF URLs

#### **Data Storage:**
- **Database:** AWS RDS PostgreSQL
- **Table:** `invoices` (id, appointment_id, patient_id, amount, status, pdf_url, created_at)

#### **Event-Driven Workflow:**
```
Kafka "appointment-events" 
  → Consumer (groupId: "billing-group")
  → Calculate amount (based on doctorId)
  → Invoke AWS Lambda ("lab_result_processor")
  → Lambda generates PDF and uploads to S3
  → Lambda returns pdfUrl
  → Insert invoice record into DB with pdfUrl
```

#### **API Endpoints:**
```
GET    /invoices        - List all invoices
POST   /invoices/:id/pay - Mark invoice as PAID
```

#### **Lambda Integration:**
- **Function Name:** `lab_result_processor`
- **Payload:** `{ invoiceId, patientId, amount, date, status }`
- **Response:** `{ statusCode: 200, pdfUrl: "https://..." }`

#### **Environment Variables:**
```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME
KAFKA_BROKERS, KAFKA_SASL_USERNAME, KAFKA_SASL_PASSWORD, KAFKA_SSL
AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
```

---

### **5. Analytics Service** (Apache Flink)
**Technology Stack:** Java 11 + Apache Flink 1.18.0 + Kafka Connector  
**Purpose:** Real-time stream processing and analytics aggregation

#### **Responsibilities:**
- Consume appointment events from Kafka
- Calculate real-time metrics:
  - **Total events created** (cumulative counter)
  - **Average appointments per hour** (sliding window)
- Maintain stateful stream processing
- Publish analytics results back to Kafka

#### **Flink Job Architecture:**

**Data Flow:**
```
Kafka Source: "appointment-events"
  ↓
Parse JSON (AppointmentEvent POJO)
  ↓
KeyBy("global") - Single key for global state
  ↓
CumulativeMetricsFunction (Stateful Processing)
  - ValueState: cumulativeCount
  - ValueState: windowStart
  - ValueState: windowCount
  - Hourly window reset logic
  ↓
Create Analytics Result (JSON)
  ↓
Kafka Sink: "analytics-results"
```

**Processing Logic:**
1. **Cumulative Counter:** Increments on every event
2. **Hourly Rate Calculation:**
   - Tracks events within 1-hour window
   - Resets window after 3600000ms (1 hour)
   - Calculates: `avgPerHour = windowCount / elapsedHours`

**Output Schema:**
```json
{
  "metricType": "AppointmentAnalytics",
  "totalEventsCreated": 150,
  "avgAppointmentsPerHour": 12.5,
  "windowStartTime": 1701234567890,
  "windowEndTime": 1701238167890,
  "timestamp": 1701238167890
}
```

#### **Deployment:**
- **Execution Environment:** Standalone or cluster
- **Main Class:** `com.healthcare.streaming.HealthcareAnalyticsJob`
- **Build Tool:** Maven with Shade plugin (Fat JAR)

#### **Kafka Configuration:**
- **Bootstrap Servers:** `pkc-n3603.us-central1.gcp.confluent.cloud:9092`
- **Security:** SASL_SSL with PLAIN mechanism
- **Consumer Group:** `healthcare-analytics-group`
- **Offset Strategy:** Latest

---

### **6. Lab Result Processor (AWS Lambda)**
**Runtime:** Node.js (Bun/TypeScript compiled)  
**Technology Stack:** AWS Lambda + S3 SDK + PDFKit  
**Purpose:** Serverless invoice PDF generation

#### **Responsibilities:**
- Generate invoice PDFs dynamically
- Upload PDFs to S3 bucket
- Return S3 URL to caller (Billing Service)

#### **Workflow:**
```
Billing Service invokes Lambda
  ↓
Lambda receives payload: { invoiceId, patientId, amount, date, status }
  ↓
Generate PDF using PDFKit:
  - Invoice ID
  - Date
  - Patient ID
  - Amount Due
  - Status
  ↓
Upload to S3: s3://bucket/invoices/invoice_{id}.pdf
  ↓
Return: { statusCode: 200, pdfUrl: "https://..." }
```

#### **S3 Bucket Structure:**
```
healthcare-lab-reports-bucket/
  └── invoices/
      ├── invoice_1.pdf
      ├── invoice_2.pdf
      └── invoice_N.pdf
```

#### **Environment Variables:**
```
AWS_REGION, LAB_BUCKET_NAME
```

---

### **7. Web Portal**
**Port:** `80` (nginx serves static build)  
**Technology Stack:** React + Vite + TypeScript + TailwindCSS  
**Purpose:** Frontend UI for healthcare system

#### **Features:**
- User authentication (login/register)
- Patient management (CRUD)
- Appointment booking
- Billing/invoice management with PDF download
- **Real-time analytics dashboard** (WebSocket)

#### **Real-Time Analytics Integration:**

**WebSocket Connection:**
```typescript
const ws = new WebSocket(API_URLS.WS_APPOINTMENT);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.metricType === 'AppointmentAnalytics') {
    setMetrics(data); // Update UI in real-time
  }
};
```

**Analytics Display:**
- **Total Events Created:** Cumulative counter
- **Average Appointments/Hour:** Sliding window metric

#### **API Configuration:**
All backend services are accessed via AWS LoadBalancer URLs (configured in `config.ts`)

---

## 🔄 Data Flow Architecture

### **Flow 1: Appointment Creation → Billing**

```
User (Web Portal)
  ↓ POST /appointments
Appointment Service
  ↓ Save to DB (appointments table)
  ↓ Publish event to Kafka
Kafka Topic: "appointment-events"
  ↓ Consumer 1: Billing Service
Billing Service
  ↓ Invoke Lambda (lab_result_processor)
AWS Lambda
  ↓ Generate PDF
  ↓ Upload to S3
  ↓ Return pdfUrl
Billing Service
  ↓ Insert invoice + pdfUrl into DB
```

### **Flow 2: Real-Time Analytics Pipeline**

```
Appointment Service
  ↓ Publish event to Kafka
Kafka Topic: "appointment-events"
  ↓ Consumer: Apache Flink Job
Flink Stream Processing
  ↓ Stateful aggregation (cumulative count + hourly avg)
  ↓ Publish result to Kafka
Kafka Topic: "analytics-results"
  ↓ Consumer: Appointment Service
Appointment Service
  ↓ Broadcast via WebSocket
Web Portal (React)
  ↓ Update UI in real-time
```

---

## ☁️ Cloud Infrastructure

### **AWS Services Used:**

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **EKS (Elastic Kubernetes Service)** | Container orchestration for microservices | Cluster: healthcare-cluster, Region: us-east-1 |
| **RDS PostgreSQL** | Relational database for Auth, Appointments, Billing | Multi-AZ deployment |
| **DynamoDB** | NoSQL database for Patient records | On-demand capacity |
| **S3** | Object storage for invoice PDFs | Bucket: healthcare-lab-reports-bucket |
| **Lambda** | Serverless PDF generation | Function: lab_result_processor |
| **ECR (Optional)** | Docker image registry | Alternative to Docker Hub |
| **Application Load Balancer** | Exposes services publicly | Type: LoadBalancer per service |

### **Confluent Cloud:**

| Resource | Configuration |
|----------|--------------|
| **Kafka Cluster** | Hosted on GCP (us-central1) |
| **Topics** | `appointment-events`, `analytics-results` |
| **Security** | SASL_SSL with API Key/Secret |
| **Bootstrap Server** | `pkc-n3603.us-central1.gcp.confluent.cloud:9092` |

---

## 🐳 Kubernetes Deployment

### **Deployment Strategy:**

All microservices are deployed to **AWS EKS** with:
- **Replicas:** 2 pods per service (High Availability)
- **Service Type:** LoadBalancer (External access)
- **Secrets Management:** Kubernetes Secrets (`app-secrets`)

### **Services & Ports:**

| Service | Replicas | Container Port | External Port | LoadBalancer URL |
|---------|----------|----------------|---------------|------------------|
| auth-service | 2 | 3000 | 80 | AWS ELB URL |
| patient-service | 2 | 3001 | 80 | AWS ELB URL |
| appointment-service | 2 | 3002 | 80 | AWS ELB URL |
| billing-service | 2 | 3003 | 80 | AWS ELB URL |
| web-portal | 2 | 80 | 80 | AWS ELB URL |

### **Environment Injection:**

All services receive configuration via Kubernetes Secrets:
- Database credentials (DB_HOST, DB_USER, DB_PASSWORD)
- Kafka credentials (KAFKA_BROKERS, KAFKA_SASL_USERNAME, KAFKA_SASL_PASSWORD)
- AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
- JWT secrets

---

## 🔐 Security Architecture

### **Authentication & Authorization:**
- **JWT (JSON Web Tokens):** 1-hour expiration
- **Bcrypt:** Password hashing (10 rounds)

### **Secrets Management:**
- **Kubernetes Secrets:** Encrypted at rest
- **Environment Variables:** Injected at runtime

### **Network Security:**
- **TLS/SSL:** Kafka uses SASL_SSL
- **CORS:** Enabled on all services

### **Database Security:**
- **RDS:** SSL connections, private subnets
- **DynamoDB:** IAM role-based access

---

## 📊 Observability & Monitoring

### **Logging:**
- **Approach:** Console logging in all services
- **Future Enhancement:** Integrate with AWS CloudWatch or ELK stack

### **Metrics:**
- **Kubernetes HPA:** Auto-scaling based on CPU/Memory (configured in k8s/hpa.yaml)
- **Flink Metrics:** Built-in Flink monitoring via web UI

### **Health Checks:**
- Each service exposes `GET /` for health monitoring

---

## 🔧 Technology Stack Summary

| Layer | Technology |
|-------|-----------|
| **Runtime** | Bun (JavaScript/TypeScript) |
| **Web Framework** | Hono (lightweight HTTP framework) |
| **Frontend** | React + Vite + TailwindCSS |
| **Stream Processing** | Apache Flink 1.18.0 (Java) |
| **Message Broker** | Apache Kafka (Confluent Cloud) |
| **Databases** | PostgreSQL (RDS), DynamoDB |
| **Serverless** | AWS Lambda (Node.js) |
| **Container Orchestration** | Kubernetes (AWS EKS) |
| **Infrastructure as Code** | Terraform |
| **CI/CD** | Docker + Docker Hub |

---

## 🚀 Deployment Workflow

1. **Infrastructure Provisioning:** Terraform provisions AWS resources (EKS, RDS, DynamoDB, S3, Lambda)
2. **Build Docker Images:** Each service has a Dockerfile
3. **Push to Registry:** Docker Hub (laxmanlp777/*)
4. **Deploy to Kubernetes:** `kubectl apply -f k8s/deployments.yaml`
5. **Configure Secrets:** `kubectl apply -f k8s/secrets.yaml`
6. **Deploy Flink Job:** Submit JAR to Flink cluster or run standalone
7. **Access Application:** Via LoadBalancer URLs

---

## 📈 Scalability Design

### **Horizontal Scaling:**
- **Kubernetes HPA:** Auto-scales pods based on resource utilization
- **Stateless Services:** All microservices are stateless (except Flink state)
- **Database Scaling:** RDS read replicas, DynamoDB auto-scaling

### **Event-Driven Architecture:**
- **Decoupling:** Services communicate via Kafka (async)
- **Fault Tolerance:** Kafka retains events for replay
- **Load Distribution:** Multiple consumers in same group

### **Flink Scaling:**
- **Parallelism:** Configurable task parallelism
- **State Backend:** RocksDB for large state management

---

## 🎯 Key Architectural Decisions

### **1. Why Bun instead of Node.js?**
- **Performance:** 3-4x faster startup time
- **Native TypeScript:** No build step needed for development
- **Compatibility:** Works with Node.js packages

### **2. Why DynamoDB for Patient Service?**
- **Flexibility:** Patient records may have varying attributes
- **Performance:** Single-digit millisecond latency
- **Scalability:** Automatic scaling without management

### **3. Why Apache Flink for Analytics?**
- **Stateful Processing:** Built-in support for windowing and aggregations
- **Exactly-Once Semantics:** Ensures accurate metrics
- **Low Latency:** Sub-second processing for real-time insights

### **4. Why WebSocket for Analytics?**
- **Real-Time Updates:** Push-based model (no polling)
- **Efficiency:** Single connection for continuous data flow
- **User Experience:** Live dashboard updates

### **5. Why Lambda for PDF Generation?**
- **Cost-Effective:** Pay only for execution time
- **Scalability:** Auto-scales with demand
- **Isolation:** Doesn't block billing service

---

## 🔍 Data Models

### **appointments (PostgreSQL)**
```sql
CREATE TABLE appointments (
  id SERIAL PRIMARY KEY,
  patient_id VARCHAR(255),
  doctor_id VARCHAR(255),
  time TIMESTAMP
);
```

### **invoices (PostgreSQL)**
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  appointment_id VARCHAR(255),
  patient_id VARCHAR(255),
  amount DECIMAL(10,2),
  status VARCHAR(50),
  pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### **users (PostgreSQL)**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255)
);
```

### **patients (DynamoDB)**
```json
{
  "id": "uuid-string",
  "name": "John Doe",
  "age": 35,
  "condition": "Hypertension",
  "...": "flexible schema"
}
```

---

## 🔗 Inter-Service Communication

### **Synchronous (REST):**
- Web Portal → All Services (HTTP/HTTPS)
- Billing Service → Lambda (AWS SDK)

### **Asynchronous (Event-Driven):**
- Appointment Service → Kafka → Billing Service
- Appointment Service → Kafka → Flink Analytics
- Flink Analytics → Kafka → Appointment Service

### **Real-Time (WebSocket):**
- Appointment Service → Web Portal (Analytics Push)

---

## 📦 Project Structure

```
cloud_assignment_15/
├── analytics-service/          # Flink streaming job (Java)
│   ├── src/main/java/...
│   └── pom.xml
├── appointment-service/        # Appointment + WebSocket (Bun)
│   ├── index.ts
│   ├── kafka.ts
│   └── db.ts
├── auth-service/              # Authentication (Bun)
│   ├── index.ts
│   └── db.ts
├── billing-service/           # Billing + Kafka consumer (Bun)
│   ├── index.ts
│   ├── kafka.ts
│   └── db.ts
├── patient-service/           # Patient management (Bun)
│   ├── index.ts
│   └── db.ts
├── lab-result-func/           # Lambda PDF generator (Node.js)
│   └── index.ts
├── web-portal/                # React frontend
│   └── src/
├── infrastructure/            # Terraform configs
│   ├── aws/
│   ├── gcp/
│   └── confluent/
├── k8s/                      # Kubernetes manifests
│   ├── deployments.yaml
│   ├── secrets.yaml
│   └── hpa.yaml
└── docker-push.sh            # Docker build/push script
```

---

## ✅ Current Implementation Status

| Component | Status | Notes |
|-----------|--------|-------|
| Auth Service | ✅ Complete | JWT authentication working |
| Patient Service | ✅ Complete | DynamoDB integration working |
| Appointment Service | ✅ Complete | Kafka + WebSocket working |
| Billing Service | ✅ Complete | Lambda integration working |
| Analytics Service | ✅ Complete | Flink job processing events |
| Lambda PDF Generator | ✅ Complete | Generates and uploads to S3 |
| Web Portal | ✅ Complete | Real-time analytics dashboard |
| Kubernetes Deployment | ✅ Complete | All services on EKS |
| Kafka Integration | ✅ Complete | Confluent Cloud |

---

## 🎓 Learning Outcomes

This architecture demonstrates:
1. **Microservices Design Patterns:** Service decomposition, API gateway, event sourcing
2. **Event-Driven Architecture:** Kafka for async communication
3. **Stream Processing:** Apache Flink for real-time analytics
4. **Serverless Computing:** AWS Lambda for event-driven tasks
5. **Cloud-Native Development:** Kubernetes, containers, infrastructure as code
6. **Polyglot Persistence:** SQL, NoSQL, object storage
7. **Real-Time Communication:** WebSocket for live updates
8. **DevOps Practices:** Docker, K8s, automated deployments

---

## 🔮 Future Enhancements

1. **API Gateway:** Add Kong/AWS API Gateway for centralized routing
2. **Service Mesh:** Implement Istio for advanced traffic management
3. **Monitoring:** Integrate Prometheus + Grafana
4. **Logging:** Centralized logging with ELK stack
5. **Caching:** Redis for frequently accessed data
6. **CDN:** CloudFront for static assets
7. **CI/CD:** GitHub Actions or Jenkins pipeline
8. **Multi-Region:** Deploy across multiple AWS regions
9. **GraphQL:** Unified API layer
10. **Machine Learning:** Predictive analytics for patient care

---

## 📞 Support & Documentation

- **Architecture Diagram:** See top of document
- **API Documentation:** Each service has inline comments
- **Deployment Guide:** See DEPLOYMENT.md (may be outdated)
- **Code Repository:** Current working directory

---

**Last Updated:** 2025-11-29  
**Architecture Version:** 2.0  
**System Status:** Production-Ready ✅
