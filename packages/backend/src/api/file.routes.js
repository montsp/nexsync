
const express = require('express');
const multer = require('multer');
const { drive, auth } = require('../config/googleClients');
const authMiddleware = require('../middleware/authMiddleware');
const stream = require('stream'); // streamモジュールをインポート

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() }); // ファイルをメモリに一時保存

// Google Driveのアップロード先フォルダID
const GOOGLE_DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID;

if (!GOOGLE_DRIVE_FOLDER_ID) {
    console.error('GOOGLE_DRIVE_FOLDER_ID is not set in .env file.');
    // アプリケーションの起動をブロックするか、エラーハンドリングを強化する
}

// ファイルアップロードエンドポイント
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        // BufferをReadableStreamに変換
        const bufferStream = new stream.Readable();
        bufferStream.push(req.file.buffer);
        bufferStream.push(null); // ストリームの終わりを示す

        // Google Driveにファイルをアップロード
        const fileMetadata = {
            name: req.file.originalname,
            parents: [GOOGLE_DRIVE_FOLDER_ID], // 指定フォルダにアップロード
        };
        const media = {
            mimeType: req.file.mimetype,
            body: bufferStream, // ReadableStreamを渡す
        };

        const uploadedFile = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink', // 必要なフィールドのみ取得
        });

        // アップロードしたファイルを公開設定にする
        await drive.permissions.create({
            fileId: uploadedFile.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        res.status(200).json({
            message: 'File uploaded successfully',
            fileId: uploadedFile.data.id,
            webViewLink: uploadedFile.data.webViewLink, // ブラウザで開くリンク
            webContentLink: uploadedFile.data.webContentLink, // 直接ダウンロードリンク
        });

    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
        res.status(500).json({ message: 'Failed to upload file.', error: error.message });
    }
});

module.exports = router;
