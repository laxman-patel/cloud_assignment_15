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
                { value: JSON.stringify({ event: 'AppointmentCreated', appointmentId, patientId, time }) },
            ],
        });

        return c.json({ id: appointmentId, message: 'Appointment booked' }, 201);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to book appointment', err }, 500);
    }
})

export default {
    port: 3002,
    fetch: app.fetch,
}