import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { S3Event } from 'aws-lambda';
// @ts-ignore
import pdf from 'pdf-parse';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL || 'http://patient-service:3001';

export const handler = async (event: S3Event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        try {
            const command = new GetObjectCommand({ Bucket: bucket, Key: key });
            const response = await s3.send(command);

            // Convert stream to buffer
            const streamToBuffer = (stream: any) =>
                new Promise<Buffer>((resolve, reject) => {
                    const chunks: any[] = [];
                    stream.on("data", (chunk: any) => chunks.push(chunk));
                    stream.on("error", reject);
                    stream.on("end", () => resolve(Buffer.concat(chunks)));
                });

            const buffer = await streamToBuffer(response.Body);
            const data = await pdf(buffer);
            const text = data.text;

            console.log(`Processed file ${key}. Extracted text length: ${text.length}`);

            // Assume filename is the patient ID (e.g., "12345.pdf")
            const patientId = key.split('.')[0];

            // Call Patient Service to update record
            const updateRes = await fetch(`${PATIENT_SERVICE_URL}/patients/${patientId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    labResults: text,
                    lastLabUpdate: new Date().toISOString()
                })
            });

            if (!updateRes.ok) {
                throw new Error(`Failed to update patient service: ${updateRes.statusText}`);
            }

            console.log(`Successfully updated patient ${patientId} with lab results.`);

        } catch (err) {
            console.error(`Error processing object ${key} from bucket ${bucket}.`, err);
            throw err;
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Lab reports processed' }),
    };
};