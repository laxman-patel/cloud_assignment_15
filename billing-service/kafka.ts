import { Kafka } from 'kafkajs';
import { query } from './db';

const kafka = new Kafka({
    clientId: 'billing-service',
    brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
    ssl: process.env.KAFKA_SSL === 'true',
    sasl: process.env.KAFKA_SASL_USERNAME ? {
        mechanism: 'plain',
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD!,
    } : undefined,
});

const consumer = kafka.consumer({ groupId: 'billing-group' });

export const startConsumer = async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: 'appointment-events', fromBeginning: true });

    await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
            if (!message.value) return;
            const event = JSON.parse(message.value.toString());
            console.log('Received event:', event);

            if (event.event === 'AppointmentCreated') {
                // Generate invoice
                try {
                    await query(
                        'INSERT INTO invoices (appointment_id, amount, status) VALUES ($1, $2, $3)',
                        [event.appointmentId, 100.00, 'PENDING']
                    );
                    console.log(`Invoice created for appointment ${event.appointmentId}`);
                } catch (err) {
                    console.error('Failed to create invoice:', err);
                }
            }
        },
    });
};
