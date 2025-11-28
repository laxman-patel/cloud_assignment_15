import { Kafka } from 'kafkajs';
import { query } from './db';
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

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

const lambda = new LambdaClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    } : undefined
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

            // ...

            if (event.event === 'AppointmentCreated') {
                // Generate invoice
                try {
                    const doctorIdNum = parseInt(event.doctorId) || 1;
                    const amount = 50 + (doctorIdNum * 10);
                    const date = new Date().toISOString().split('T')[0];

                    // 1. Invoke Lambda to generate PDF
                    const payload = {
                        invoiceId: event.appointmentId, // Using appointmentId as invoiceId for simplicity
                        patientId: event.patientId,
                        amount,
                        date,
                        status: 'PENDING'
                    };

                    const command = new InvokeCommand({
                        FunctionName: 'lab_result_processor', // This is the function name in Terraform
                        Payload: JSON.stringify(payload),
                    });

                    const lambdaRes = await lambda.send(command);
                    const lambdaResult = JSON.parse(new TextDecoder().decode(lambdaRes.Payload));

                    const pdfUrl = lambdaResult.pdfUrl || '';
                    console.log(`Generated PDF URL: ${pdfUrl}`);

                    // 2. Insert into DB with PDF URL
                    await query(
                        'INSERT INTO invoices (appointment_id, amount, status, pdf_url, patient_id) VALUES ($1, $2, $3, $4, $5)',
                        [event.appointmentId, amount, 'PENDING', pdfUrl, event.patientId]
                    );
                    console.log(`Invoice created for appointment ${event.appointmentId} with amount $${amount}`);
                } catch (err) {
                    console.error('Failed to create invoice:', err);
                    console.error('Error details:', JSON.stringify(err, Object.getOwnPropertyNames(err)));
                }
            }
        },
    });
};
