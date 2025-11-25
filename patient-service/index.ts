import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { docClient } from './db'
import { PutCommand, GetCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const app = new Hono()
app.use('/*', cors())
const TABLE_NAME = process.env.TABLE_NAME || 'patients'

app.get('/', (c) => {
    return c.text('Patient Service is running!')
})

app.get('/patients', async (c) => {
    try {
        const command = new ScanCommand({ TableName: TABLE_NAME });
        const response = await docClient.send(command);
        return c.json(response.Items || []);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to fetch patients' }, 500);
    }
})

app.get('/patients/:id', async (c) => {
    const id = c.req.param('id')
    try {
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { id },
        });
        const response = await docClient.send(command);
        if (!response.Item) return c.json({ error: 'Patient not found' }, 404);
        return c.json(response.Item);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to fetch patient' }, 500);
    }
})

app.post('/patients', async (c) => {
    const body = await c.req.json();
    const id = uuidv4();
    const patient = { id, ...body };

    try {
        const command = new PutCommand({
            TableName: TABLE_NAME,
            Item: patient,
        });
        await docClient.send(command);
        return c.json(patient, 201);
    } catch (err) {
        console.error(err);
        return c.json({ error: 'Failed to create patient' }, 500);
    }
})

export default {
    port: 3001,
    fetch: app.fetch,
}