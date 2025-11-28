import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import PDFDocument from 'pdfkit';

const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
const BUCKET_NAME = process.env.LAB_BUCKET_NAME || 'healthcare-lab-reports-bucket'; // Reuse existing bucket var or new one

interface InvoiceEvent {
    invoiceId: string;
    patientId: string;
    amount: number;
    date: string;
    status: string;
}

export const handler = async (event: InvoiceEvent) => {
    console.log('Received invoice generation request:', JSON.stringify(event, null, 2));

    const { invoiceId, patientId, amount, date, status } = event;
    const key = `invoices/invoice_${invoiceId}.pdf`;

    try {
        // Generate PDF
        const doc = new PDFDocument();
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));

        // PDF Content
        doc.fontSize(25).text('INVOICE', 100, 50);
        doc.fontSize(12).text(`Invoice ID: ${invoiceId}`, 100, 100);
        doc.text(`Date: ${date}`, 100, 120);
        doc.text(`Patient ID: ${patientId}`, 100, 140);

        doc.moveDown();
        doc.fontSize(16).text(`Amount Due: $${amount.toFixed(2)}`, 100, 180);
        doc.text(`Status: ${status}`, 100, 200);

        doc.end();

        // Wait for PDF to finish
        const pdfBuffer = await new Promise<Buffer>((resolve) => {
            doc.on('end', () => {
                resolve(Buffer.concat(buffers));
            });
        });

        // Upload to S3
        await s3.send(new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            // ACL: 'public-read' // Optional: if you want public access, but better to use presigned URL
        }));

        // Construct URL (assuming public or presigned - for now returning direct S3 URL)
        // In a real app, you'd generate a Presigned GET URL here if the bucket is private
        const url = `https://${BUCKET_NAME}.s3.amazonaws.com/${key}`;

        console.log(`Invoice PDF uploaded to ${url}`);

        return {
            statusCode: 200,
            pdfUrl: url
        };

    } catch (err) {
        console.error('Error generating invoice PDF:', err);
        throw err;
    }
};