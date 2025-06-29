
const express = require('express');
const channelModel = require('../models/channelModel');
const messageModel = require('../models/messageModel');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 全てのチャンネルを取得
router.get('/channels', authMiddleware, async (req, res) => {
    try {
        const channels = await channelModel.getAllChannels();
        res.status(200).json(channels);
    } catch (error) {
        console.error('Error fetching channels:', error);
        res.status(500).json({ message: 'Failed to fetch channels.' });
    }
});

// 新しいチャンネルを作成
router.post('/channels', authMiddleware, async (req, res) => {
    const { name, description } = req.body;
    const created_by = req.session.user.id; // ログインユーザーのID

    if (!name) {
        return res.status(400).json({ message: 'Channel name is required.' });
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
router.get('/channels/:channelId/messages', authMiddleware, async (req, res) => {
    const { channelId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;

    try {
        const messages = await messageModel.getChannelMessages(channelId, page, limit);
        res.status(200).json(messages);
    } catch (error) {
        console.error('Error fetching channel messages:', error);
        res.status(500).json({ message: 'Failed to fetch channel messages.' });
    }
});

// 特定の親メッセージに紐づく返信一覧を取得
router.get('/messages/:messageId/thread', authMiddleware, async (req, res) => {
    const { messageId } = req.params;
    try {
        const threadMessages = await messageModel.getThreadMessages(messageId);
        res.status(200).json(threadMessages);
    } catch (error) {
        console.error('Error fetching thread messages:', error);
        res.status(500).json({ message: 'Failed to fetch thread messages.' });
    }
});

module.exports = router;
