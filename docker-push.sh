# Auth Service
cd auth-service
docker build -t laxmanlp777/auth-service:latest .
docker push laxmanlp777/auth-service:latest
cd ..

# Patient Service
cd patient-service
docker build -t laxmanlp777/patient-service:latest .
docker push laxmanlp777/patient-service:latest
cd ..

# Appointment Service
cd appointment-service
docker build -t laxmanlp777/appointment-service:latest .
docker push laxmanlp777/appointment-service:latest
cd ..

# Billing Service
cd billing-service
docker build -t laxmanlp777/billing-service:latest .
docker push laxmanlp777/billing-service:latest
cd ..

# Web Portal (Frontend)
cd web-portal
docker build -t laxmanlp777/web-portal:latest .
docker push laxmanlp777/web-portal:latest
cd ..