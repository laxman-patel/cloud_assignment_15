import { Pool } from 'pg';

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'appointment_db',
    password: process.env.DB_PASSWORD || 'password',
    port: parseInt(process.env.DB_PORT || '5432'),
    ssl: {
        rejectUnauthorized: false
    }
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle database client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);