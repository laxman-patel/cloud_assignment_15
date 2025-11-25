import { Hono } from 'hono'
import { startConsumer } from './kafka'

const app = new Hono()

// Start Kafka Consumer
startConsumer().catch(console.error);

app.get('/', (c) => {
    return c.text('Billing Service is running!')
})

app.post('/invoices', async (c) => {
    return c.json({ message: 'Invoice generated' })
})

export default {
    port: 3003,
    fetch: app.fetch,
}