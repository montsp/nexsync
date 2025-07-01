const express = require('express');
const multer = require('multer');
const { uploadFile, getFileInfo, downloadFile } = require('../services/googleDriveService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
// メモリストレージを使用してファイルを受け取る
const upload = multer({ storage: multer.memoryStorage() });

/**
 * @route   POST /api/files/upload
 * @desc    ファイルをGoogle Driveにアップロードする
 * @access  Private
 */
router.post('/upload', authMiddleware, upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'ファイルが選択されていません。' });
    }
    try {
        // googleDriveServiceを使用してファイルをアップロードし、ファイルIDを取得
        const fileId = await uploadFile(req.file);
        // ファイルIDからファイル情報を取得
        const fileInfo = await getFileInfo(fileId);
        
        // 成功レスポンスを返す
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

/**
 * @route   GET /api/files/view/:fileId
 * @desc    Google Drive上のファイルをストリーミングして表示する
 * @access  Private
 */
router.get('/view/:fileId', authMiddleware, async (req, res) => {
    try {
        const { fileId } = req.params;
        const fileInfo = await getFileInfo(fileId);
        const fileStream = await downloadFile(fileId);

        // 正しいMIMEタイプをヘッダーに設定
        res.setHeader('Content-Type', fileInfo.mimeType);
        // ストリームをレスポンスにパイプする
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error streaming file from Google Drive:', error);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'ファイルが見つかりません。' });
        }
        res.status(500).json({ message: 'ファイルの表示に失敗しました。' });
    }
});

/**
 * @route   GET /api/files/download/:fileId
 * @desc    Google Drive上のファイルをダウンロードする
 * @access  Private
 */
router.get('/download/:fileId', authMiddleware, async (req, res) => {
    try {
        const { fileId } = req.params;
        const fileInfo = await getFileInfo(fileId);
        const fileStream = await downloadFile(fileId);

        // ダウンロードを強制するためにヘッダーを設定
        res.setHeader('Content-Type', fileInfo.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileInfo.name)}"`);
        // ストリームをレスポンスにパイプする
        fileStream.pipe(res);

    } catch (error) {
        console.error('Error downloading file from Google Drive:', error);
        if (error.response?.status === 404) {
            return res.status(404).json({ message: 'ファイルが見つかりません。' });
        }
        res.status(500).json({ message: 'ファイルのダウンロードに失敗しました。' });
    }
});

module.exports = router;