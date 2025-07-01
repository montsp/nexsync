const express = require('express');
const session = require('express-session');
require('dotenv').config();
const authRoutes = require('./api/auth.routes');
const channelRoutes = require('./api/channel.routes');
const messageRoutes = require('./api/message.routes');
const http = require('http');
const { Server } = require("socket.io");
const messageModel = require('./models/messageModel');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const port = process.env.PORT || 3001;

app.use(express.json());

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.get('/api', (req, res) => {
  res.json({ message: 'Welcome to NexSync API' });
});

app.use('/api/auth', authRoutes);
app.use('/api/channels', channelRoutes);
app.use('/api/messages', messageRoutes);

io.on('connection', (socket) => {
    console.log('a user connected');

    socket.on('joinChannel', (channelId) => {
        socket.join(channelId);
        console.log(`User joined channel: ${channelId}`);
    });

    socket.on('leaveChannel', (channelId) => {
        socket.leave(channelId);
        console.log(`User left channel: ${channelId}`);
    });

    socket.on('sendMessage', async ({ channelId, userId, content, parent_message_id }, callback) => {
        try {
            const message = await messageModel.createMessage({ channel_id: channelId, user_id: userId, content, parent_message_id });
            if (parent_message_id) {
                // スレッドの更新をチャンネルの全員に通知
                socket.to(channelId).emit('newThreadMessage', message);
            } else {
                // 新しいメッセージをチャンネルの全員に通知
                socket.to(channelId).emit('receiveMessage', message);
            }
            // 送信者自身にメッセージを返して即時表示させる
            if (callback) {
                callback(message);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            if (callback) {
                callback({ error: 'Failed to send message' });
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
});

server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
