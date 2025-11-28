import { Kafka } from 'kafkajs';

const kafka = new Kafka({
    clientId: 'appointment-service-client',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_USERNAME ? {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD!,
    } : undefined,
});



export const producer = kafka.producer();
// Use a unique group ID for each instance to ensure all instances receive the broadcast
export const consumer = kafka.consumer({ groupId: "appointment-service-group" });

export const connectKafka = async () => {
    const admin = kafka.admin();
    await admin.connect();
    const topics = await admin.listTopics();
    console.log('Available topics:', topics);
    await admin.disconnect();

    await producer.connect();
    await consumer.connect();
    console.log('Kafka producer and consumer connected');
};
