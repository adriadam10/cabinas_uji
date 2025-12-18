import fs from 'fs';
import path from 'path';
import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

const CACHE_DIR = path.join(process.cwd(), 'data');
const CACHE_FILE = path.join(CACHE_DIR, 'cache.json');
const CONTAINER_NAME = 'cache';
const BLOB_NAME = 'cache.json';

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

export async function getCache<T>(): Promise<T | null> {
    const containerClient = await getContainerClient();

    // Azure Blob Strategy
    if (containerClient) {
        try {
            const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);
            if (await blockBlobClient.exists()) {
                const downloadBlockBlobResponse = await blockBlobClient.download(0);
                const downloaded = await streamToString(downloadBlockBlobResponse.readableStreamBody);
                if (downloaded) {
                    return JSON.parse(downloaded) as T;
                }
            }
            return null;
        } catch (e) {
            console.error("Azure Blob read error", e);
            // Fallback to local is probably not desired if Azure *configured* but failed, 
            // but for safety/mixed envs we could. For now return null to force simpler behavior.
            return null;
        }
    }

    // Local Filesystem Strategy (Fallback)
    if (!fs.existsSync(CACHE_FILE)) return null;
    try {
        const data = fs.readFileSync(CACHE_FILE, 'utf-8');
        return JSON.parse(data) as T;
    } catch (e) {
        console.error("Cache read error", e);
        return null;
    }
}

export async function setCache<T>(data: T): Promise<void> {
    const containerClient = await getContainerClient();
    const dataString = JSON.stringify(data, null, 2);

    // Azure Blob Strategy
    if (containerClient) {
        try {
            const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);
            await blockBlobClient.upload(dataString, dataString.length);
            return;
        } catch (e) {
            console.error("Azure Blob write error", e);
        }
    }

    // Local Filesystem Strategy (Fallback)
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, dataString);
}

// Invalidate cache method if needed? For now manual refresh mentioned in requirements.
export async function clearCache() {
    const containerClient = await getContainerClient();

    if (containerClient) {
        try {
            const blockBlobClient = containerClient.getBlockBlobClient(BLOB_NAME);
            await blockBlobClient.deleteIfExists();
        } catch (e) {
            console.error("Azure Blob delete error", e);
        }
    }

    if (fs.existsSync(CACHE_FILE)) {
        fs.unlinkSync(CACHE_FILE);
    }
}

// Helper to read stream
async function streamToString(readableStream: NodeJS.ReadableStream | undefined): Promise<string> {
    if (!readableStream) return '';
    return new Promise((resolve, reject) => {
        const chunks: any[] = [];
        readableStream.on("data", (data) => {
            chunks.push(data.toString());
        });
        readableStream.on("end", () => {
            resolve(chunks.join(""));
        });
        readableStream.on("error", reject);
    });
}
