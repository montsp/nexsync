const express = require('express');
const multer = require('multer');
const { uploadFile, getFileInfo, downloadFile } = require('../services/googleDriveService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// ファイルアップロードAPI
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'ファイルが選択されていません。' });
    }
    try {
        const fileId = await uploadFile(req.file);
        const fileInfo = await getFileInfo(fileId);
        res.status(201).json({ 
            message: 'ファイルが正常にアップロードされました。', 
            fileId: fileInfo.id,
            fileName: fileInfo.name,
            mimeType: fileInfo.mimeType,
        });
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error);
        res.status(500).json({ message: 'ファイルのアップロードに失敗しました。' });
    }
});

// ファイル表示用のHTMLラッパーを返すAPI
router.get('/view/:fileId', authMiddleware, async (req, res) => {
    try {
        const { fileId } = req.params;
        const fileInfo = await getFileInfo(fileId);

        // MIMEタイプに基づいて適切なHTMLを生成
        let contentHtml;
        if (fileInfo.mimeType.startsWith('image/')) {
            contentHtml = `<img src="/api/files/raw/${fileId}" alt="${fileInfo.name}">`;
        } else if (fileInfo.mimeType === 'application/pdf') {
            contentHtml = `<embed src="/api/files/raw/${fileId}" type="application/pdf" width="100%" height="100%">`;
        } else {
            contentHtml = `<div class="unsupported"><p>このファイルのプレビューはサポートされていません。</p><a href="/api/files/download/${fileId}" download>「${fileInfo.name}」をダウンロード</a></div>`;
        }

        const html = `
            <!DOCTYPE html>
            <html lang="ja">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>プレビュー: ${fileInfo.name}</title>
                <style>
                    body, html { margin: 0; padding: 0; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; background-color: #f0f0f0; font-family: sans-serif; }
                    img, embed { max-width: 100%; max-height: 100%; object-fit: contain; }
                    .unsupported { text-align: center; padding: 20px; }
                </style>
            </head>
            <body>
                ${contentHtml}
            </body>
            </html>
        `;
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Error generating file view:', error);
        res.status(500).json({ message: 'ファイルの表示に失敗しました。' });
    }
});

// 生のファイルデータをストリーミングするAPI
router.get('/raw/:fileId', authMiddleware, async (req, res) => {
    try {
        const { fileId } = req.params;
        const fileInfo = await getFileInfo(fileId);
        const fileStream = await downloadFile(fileId);
        res.setHeader('Content-Type', fileInfo.mimeType);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error streaming raw file:', error);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'ファイルが見つかりません。' });
        }
        res.status(500).json({ message: 'ファイルの取得に失敗しました。' });
    }
});

// ファイルダウンロードAPI
router.get('/download/:fileId', authMiddleware, async (req, res) => {
    try {
        const { fileId } = req.params;
        const fileInfo = await getFileInfo(fileId);
        const fileStream = await downloadFile(fileId);
        res.setHeader('Content-Type', fileInfo.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.name)}"`);
        fileStream.pipe(res);
    } catch (error) {
        console.error('Error downloading file:', error);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'ファイルが見つかりません。' });
        }
        res.status(500).json({ message: 'ファイルのダウンロードに失敗しました。' });
    }
});

module.exports = router;
