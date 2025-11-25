FROM python:3.8-slim

WORKDIR /app

# Install Java (required for PyFlink)
RUN apt-get update && \
    apt-get install -y openjdk-17-jre && \
    apt-get clean

# Install PyFlink
RUN pip install apache-flink

COPY job.py .

CMD ["python", "job.py"]
