
const express = require('express');
const channelModel = require('../models/channelModel');
const messageModel = require('../models/messageModel');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 全てのチャンネルを取得
router.get('/', authMiddleware, async (req, res) => {
    try {
        const channels = await channelModel.getAllChannels();
        res.status(200).json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ message: 'Failed to fetch channels.' });
    }
});

// 新しいチャンネルを作成
router.post('/', authMiddleware, async (req, res) => {
    const { name, description } = req.body;
    const created_by = req.session.user ? req.session.user.id : null; // ログインユーザーのID

    console.log('Attempting to create channel with:', { name, description, created_by });
    console.log('Session user:', req.session.user); // 追加

    if (!name) {
        return res.status(400).json({ message: 'Channel name is required.' });
    }

    if (!created_by) {
        return res.status(401).json({ message: 'User not authenticated or session expired.' });
    }

    try {
        const newChannel = await channelModel.createChannel({ name, description, created_by });
        res.status(201).json(newChannel);
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ message: 'Failed to create channel.' });
    }
});

// 特定チャンネルのメッセージ履歴を取得 (親メッセージのみ、ページネーション)
router.get('/:channelId/messages', authMiddleware, async (req, res) => {
    const { channelId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    if (!channelId || isNaN(parseInt(channelId, 10))) {
        return res.status(400).json({ message: 'Invalid or missing channel ID.' });
    }

    try {
        const messages = await messageModel.getChannelMessages(channelId, page, limit);
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching channel messages:', error);
        res.status(500).json({ message: 'Failed to fetch channel messages.' });
    }
});

module.exports = router;
