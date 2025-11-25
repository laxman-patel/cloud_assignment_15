import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { S3Event } from 'aws-lambda';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

export const handler = async (event: S3Event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));

    for (const record of event.Records) {
        const bucket = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

        try {
            const command = new GetObjectCommand({ Bucket: bucket, Key: key });
            const response = await s3.send(command);
            const str = await response.Body?.transformToString();

            console.log(`Processed file ${key} from bucket ${bucket}. Content length: ${str?.length}`);
            // TODO: Parse PDF content and update patient record (call Patient Service)

        } catch (err) {
            console.error(`Error getting object ${key} from bucket ${bucket}.`, err);
            throw err;
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Lab reports processed' }),
    };
};