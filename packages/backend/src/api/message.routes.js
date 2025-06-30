
const express = require('express');
const messageModel = require('../models/messageModel');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// 特定の親メッセージに紐づく返信一覧を取得
router.get('/:messageId/thread', authMiddleware, async (req, res) => {
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
