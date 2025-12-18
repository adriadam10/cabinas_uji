import fs from 'fs';
import path from 'path';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

const CONTAINER_NAME = 'cache';
// Local fallback directory
const LOCAL_DIR = path.join(process.cwd(), 'data');

function getBlobServiceClient(): BlobServiceClient | null {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) return null;
    return BlobServiceClient.fromConnectionString(connectionString);
}

async function getContainerClient(): Promise<ContainerClient | null> {
    const blobServiceClient = getBlobServiceClient();
    if (!blobServiceClient) return null;

    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
    try {
        await containerClient.createIfNotExists();
        return containerClient;
    } catch (e) {
        console.error("Error creating/getting container:", e);
        return null;
    }
}

// Convert stream to Buffer
async function streamToBuffer(readableStream: NodeJS.ReadableStream | undefined): Promise<Buffer | null> {
    if (!readableStream) return null;
    return new Promise((resolve, reject) => {
        const chunks: Buffer[] = [];
        readableStream.on("data", (data) => {
            chunks.push(Buffer.isBuffer(data) ? data : Buffer.from(data));
        });
        readableStream.on("end", () => {
            resolve(Buffer.concat(chunks));
        });
        readableStream.on("error", reject);
    });
}

export async function saveFile(filename: string, content: string | Buffer): Promise<void> {
    const containerClient = await getContainerClient();
    const dataBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    // Azure Blob Strategy
    if (containerClient) {
        try {
            const blockBlobClient = containerClient.getBlockBlobClient(filename);
            await blockBlobClient.upload(dataBuffer, dataBuffer.length);
            return;
        } catch (e) {
            console.error(`Azure Blob write error for ${filename}`, e);
        }
    }

    // Local Filesystem Strategy (Fallback)
    if (!fs.existsSync(LOCAL_DIR)) {
        fs.mkdirSync(LOCAL_DIR, { recursive: true });
    }
    const filePath = path.join(LOCAL_DIR, filename);
    fs.writeFileSync(filePath, dataBuffer);
}

export async function getFile(filename: string): Promise<Buffer | null> {
    const containerClient = await getContainerClient();

    // Azure Blob Strategy
    if (containerClient) {
        try {
            const blockBlobClient = containerClient.getBlockBlobClient(filename);
            if (await blockBlobClient.exists()) {
                const downloadBlockBlobResponse = await blockBlobClient.download(0);
                return await streamToBuffer(downloadBlockBlobResponse.readableStreamBody);
            }
            return null;
        } catch (e) {
            console.error(`Azure Blob read error for ${filename}`, e);
            // Fallback could be considered here if we want hybrid behavior, 
            // but consistency is usually better. 
            // However, existing cache logic returned null on azure failure, so we stick to that.
            return null;
        }
    }

    // Local Filesystem Strategy (Fallback)
    const filePath = path.join(LOCAL_DIR, filename);
    if (!fs.existsSync(filePath)) return null;

    try {
        return fs.readFileSync(filePath);
    } catch (e) {
        console.error(`Local file read error for ${filename}`, e);
        return null;
    }
}

export async function deleteFile(filename: string): Promise<void> {
    const containerClient = await getContainerClient();

    // Azure Blob Strategy
    if (containerClient) {
        try {
            const blockBlobClient = containerClient.getBlockBlobClient(filename);
            await blockBlobClient.deleteIfExists();
        } catch (e) {
            console.error(`Azure Blob delete error for ${filename}`, e);
        }
    }

    // Local Filesystem Strategy (Fallback)
    const filePath = path.join(LOCAL_DIR, filename);
    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (e) {
            console.error(`Local file delete error for ${filename}`, e);
        }
    }
}
