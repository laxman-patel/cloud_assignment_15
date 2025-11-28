import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { startConsumer } from './kafka'
import { query } from './db'

const app = new Hono()

// Initialize DB
const initDb = async () => {
    try {
        await query(`
            CREATE TABLE IF NOT EXISTS invoices (
                id SERIAL PRIMARY KEY,
                appointment_id VARCHAR(255) NOT NULL,
                amount DECIMAL(10, 2) NOT NULL,
                status VARCHAR(50) NOT NULL,
                pdf_url TEXT,
                patient_id VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Add columns if they don't exist (migration hack)
        try {
            await query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS pdf_url TEXT');
            await query('ALTER TABLE invoices ADD COLUMN IF NOT EXISTS patient_id VARCHAR(255)');
        } catch (e) {
            console.log('Columns might already exist');
        }

        console.log('Invoices table checked/created');
    } catch (err) {
        console.error('Failed to initialize DB:', err);
    }
};

initDb().then(() => {
    // Start Kafka Consumer only after DB is ready
    startConsumer().catch(console.error);
});

app.use('/*', cors())

app.get('/', (c) => {
    return c.text('Billing Service is running!')
})

// ...

app.get('/invoices', async (c) => {
    try {
        const res = await query('SELECT * FROM invoices ORDER BY id DESC');
        // Map DB columns to frontend expected format if needed
        // Assuming DB columns: id, appointment_id, amount, status, created_at
        const invoices = res.rows.map((row: any) => ({
            id: row.id,
            patientId: row.patient_id || row.appointment_id, // Fallback to appointment_id if patient_id is null
            amount: parseFloat(row.amount),
            status: row.status,
            pdfUrl: row.pdf_url,
            date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }));
        return c.json(invoices);
    } catch (err) {
        console.log(JSON.stringify(err));
        return c.json({ error: 'Failed to fetch invoices' }, 500);
    }
})

app.post('/invoices/:id/pay', async (c) => {
    const id = c.req.param('id');
    try {
        await query('UPDATE invoices SET status = $1 WHERE id = $2', ['PAID', id]);
        return c.json({ message: 'Invoice paid successfully' });
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to pay invoice' }, 500);
    }
})

app.post('/invoices', async (c) => {
    return c.json({ message: 'Invoice generated' })
})

export default {
    port: 3003,
    fetch: app.fetch,
}