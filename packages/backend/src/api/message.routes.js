
const express = require('express');
const messageModel = require('../models/messageModel');
const userModel = require('../models/userModel');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// メッセージ投稿 (メンション対応)
router.post('/', authMiddleware, async (req, res) => {
    const { channel_id, content, parent_message_id } = req.body;
    const user_id = req.session.user.id;

    if (!channel_id || !content) {
        return res.status(400).json({ message: 'Channel ID and content are required.' });
    }

    try {
        // メンションを解析
        const mentionRegex = /@(\w+)/g;
        const mentionedUsernames = (content.match(mentionRegex) || []).map(mention => mention.substring(1));
        const mentionedUsers = await userModel.findUsersByUsernames(mentionedUsernames);
        const mentioned_user_ids = mentionedUsers.map(u => u.user_id);

        const newMessage = await messageModel.createMessage({ 
            channel_id, 
            user_id, 
            content, 
            parent_message_id, 
            mentioned_user_ids 
        });

        // Socket.ioでブロードキャスト (index.jsで実装)
        req.io.to(channel_id).emit('new_message', newMessage);

        res.status(201).json(newMessage);
    } catch (error) {
        console.error('Error creating message:', error);
        res.status(500).json({ message: 'Failed to create message.' });
    }
});

// リアクションの追加/削除
router.post('/:messageId/toggle-reaction', authMiddleware, async (req, res) => {
    const { messageId } = req.params;
    const { emoji } = req.body;
    const userId = req.session.user.id;

    if (!emoji) {
        return res.status(400).json({ message: 'Emoji is required.' });
    }

    try {
        const updatedMessage = await messageModel.toggleReaction(messageId, userId, emoji);
        req.io.to(updatedMessage.channel_id.toString()).emit('message_updated', updatedMessage);
        res.status(200).json(updatedMessage);
    } catch (error) {
        console.error('Error toggling reaction:', error);
        res.status(500).json({ message: 'Failed to toggle reaction.' });
    }
});

// メッセージ編集
router.patch('/:messageId', authMiddleware, async (req, res) => {
    const { messageId } = req.params;
    const { content } = req.body;
    const userId = req.session.user.id;

    if (!content) {
        return res.status(400).json({ message: 'Content is required.' });
    }

    try {
        const updatedMessage = await messageModel.updateMessage(messageId, userId, content);
        if (!updatedMessage) {
            return res.status(404).json({ message: 'Message not found or you do not have permission to edit it.' });
        }
        req.io.to(updatedMessage.channel_id.toString()).emit('message_updated', updatedMessage);
        res.status(200).json(updatedMessage);
    } catch (error) {
        console.error('Error updating message:', error);
        res.status(500).json({ message: 'Failed to update message.' });
    }
});

// メッセージ削除
router.delete('/:messageId', authMiddleware, async (req, res) => {
    const { messageId } = req.params;
    const user = req.session.user;

    // ここで管理者かどうかのチェックを入れる (今回は未実装)

    try {
        const deletedMessage = await messageModel.deleteMessage(messageId);
        req.io.to(deletedMessage.channel_id.toString()).emit('message_deleted', { id: messageId });
        res.status(200).json({ message: 'Message deleted successfully.' });
    } catch (error) {
        console.error('Error deleting message:', error);
        res.status(500).json({ message: 'Failed to delete message.' });
    }
});

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
