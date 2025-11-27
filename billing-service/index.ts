import { Hono } from 'hono'
import { startConsumer } from './kafka'

const app = new Hono()

// Start Kafka Consumer
startConsumer().catch(console.error);

app.get('/', (c) => {
    return c.text('Billing Service is running!')
})

app.get('/invoices', async (c) => {
    // Mock data for now as we haven't set up the DB connection in this file yet
    // In a real scenario, we would query the billing DB
    return c.json([
        { id: '1', patientId: 'p1', amount: 150, status: 'PAID', date: '2023-10-27' },
        { id: '2', patientId: 'p2', amount: 200, status: 'PENDING', date: '2023-10-28' },
    ])
})

app.post('/invoices', async (c) => {
    return c.json({ message: 'Invoice generated' })
})

export default {
    port: 3003,
    fetch: app.fetch,
}