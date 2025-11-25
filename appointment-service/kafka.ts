import { Kafka } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'appointment-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_USERNAME ? {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD!,
    } : undefined,
});

export const producer = kafka.producer();

export const connectKafka = async () => {
    await producer.connect();
    console.log('Kafka producer connected');
};
