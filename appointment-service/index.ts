import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { query } from './db'
import { producer, connectKafka } from './kafka'

const app = new Hono()
app.use('/*', cors())

// Connect to Kafka on startup
connectKafka().catch(console.error);

app.get('/', (c) => {
    return c.text('Appointment Service is running!')
})

app.get('/appointments', async (c) => {
    try {
        const res = await query('SELECT * FROM appointments ORDER BY time DESC');
        return c.json(res.rows);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to fetch appointments' }, 500);
    }
})

app.post('/appointments', async (c) => {
    const { patientId, doctorId, time } = await c.req.json();

    try {
        // Save to DB
        const res = await query(
            'INSERT INTO appointments (patient_id, doctor_id, time) VALUES ($1, $2, $3) RETURNING id',
            [patientId, doctorId, time]
        );
        const appointmentId = res.rows[0].id;

        // Publish event
        await producer.send({
            topic: 'appointment-events',
            messages: [
                { value: JSON.stringify({ event: 'AppointmentCreated', appointmentId, patientId, doctorId, time }) },
            ],
        });

        return c.json({ id: appointmentId, message: 'Appointment booked' }, 201);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to book appointment', err: JSON.stringify(err) }, 500);
    }
})

import type { ServerWebSocket } from "bun";

// Store connected clients
const clients = new Set<ServerWebSocket<unknown>>();

// Subscribe to analytics-insights
import { consumer } from './kafka';

const runConsumer = async () => {
    await consumer.subscribe({ topic: 'analytics-results', fromBeginning: false });
    await consumer.run({
        eachMessage: async ({ message }) => {
            const value = message.value?.toString();
            if (value) {
                console.log('Received insight:', value);
                console.log('Number of connected clients:', clients.size);

                // Broadcast to all connected clients
                const deadClients = new Set<ServerWebSocket<unknown>>();
                for (const client of clients) {
                    try {
                        console.log('Sending to client...');
                        client.send(value);
                        console.log('Sent successfully');
                    } catch (error) {
                        console.error('Failed to send to client:', error);
                        deadClients.add(client);
                    }
                }

                deadClients.forEach(client => clients.delete(client));
            }
        },
    });
};

// Start consumer in background
runConsumer().catch(console.error);

export default {
    port: 3002,
    fetch(req: Request, server: any) {
        if (server.upgrade(req)) {
            return;
        }
        return app.fetch(req, server);
    },
    websocket: {
        open(ws: ServerWebSocket<unknown>) {
            clients.add(ws);

            console.log('Client connected');
        },
        close(ws: ServerWebSocket<unknown>) {
            clients.delete(ws);
            console.log('Client disconnected');
        },
        message(ws: ServerWebSocket<unknown>, message: string) {
            // We don't expect messages from client, but handle if needed
        },
    },
}