import express from 'express';
import cors from 'cors';
import { Readable } from 'stream'
import dotenv from 'dotenv';
dotenv.config({path : '../.env'});
const app = express();
import { Storage } from '@google-cloud/storage';
import {getAllStories} from "./database.js";
import multer from "multer";
const PORT = process.env.SERVER_PORT;
const localStorage = multer.memoryStorage()
const upload = multer({ storage: localStorage })
const storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_KEY_FILE,
});
export const startServer = () => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
};
const bucket = storage.bucket(process.env.GCP_BUCKET_NAME);
app.use(cors({
    origin: 'https://1339.ngrok-free.app'
}));
app.post('/upload',upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            console.log("No file uploaded");
            return res.status(400).json({ message: 'No file uploaded' });
        }
        const storagePath = `${process.env.GCP_DIRECTORY_STORIES_NAME}/${req.file.originalname}`; // Путь в GCS
        const file = bucket.file(storagePath);
        Readable.from(req.file.buffer).pipe(file.createWriteStream({
            destination: storagePath,
            metadata: {
                contentType: "image/png",
            }
        }))
            .on('error', function(err) {})
            .on('finish', function() {})
        res.status(200).json({ message: 'File uploaded successfully'});
        console.log("File uploaded successfully");
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error uploading file', error: error.message });
    }
});
app.get('/stories', async (req, res) => {
    try {
        const stories = await getAllStories();
        res.status(200).json(stories);
    } catch (error) {
        console.log('Ошибка при получении историй: ', error);
        res.status(500).json({ message: 'Ошибка при получении историй', error: error.message });
    }
});
