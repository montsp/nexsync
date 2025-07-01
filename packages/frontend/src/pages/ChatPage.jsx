import React, { useState, useEffect, useRef } from 'react';
import { io } from "socket.io-client";
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  TextField,
  IconButton,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import SendIcon from '@mui/icons-material/Send';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ReplyIcon from '@mui/icons-material/Reply';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const ChatPage = () => {
  const { user, logout } = useAuth();
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [openNewChannelDialog, setOpenNewChannelDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [currentThread, setCurrentThread] = useState(null);
  const [threadMessages, setThreadMessages] = useState([]);
  const [threadRepliesCount, setThreadRepliesCount] = useState({});
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
    });

    socketRef.current.on('receiveMessage', (message) => {
      console.log('Received message:', message);
      setMessages((prevMessages) => [...prevMessages, message]);
    });

    socketRef.current.on('newThreadMessage', (message) => {
        console.log('Received new thread message:', message);
        if (currentThread && message.parent_message_id === currentThread.id) {
            setThreadMessages((prev) => [...prev, message]);
        }
        setThreadRepliesCount(prev => ({
            ...prev,
            [message.parent_message_id]: (prev[message.parent_message_id] || 0) + 1
        }));
    });

    fetchChannels();

    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (currentChannel) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      fetchMessages(currentChannel.id, 1);
      socketRef.current.emit('joinChannel', currentChannel.id);
      setCurrentThread(null); // チャンネル切り替え時にスレッドを閉じる
    }

    return () => {
      if (currentChannel) {
        socketRef.current.emit('leaveChannel', currentChannel.id);
      }
    };
  }, [currentChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadMessages]);

  const fetchChannels = async () => {
    try {
      const response = await fetch('/api/channels');
      const data = await response.json();
      setChannels(data);
      if (data.length > 0) {
        setCurrentChannel(data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
    }
  };

  const fetchMessages = async (channelId, page) => {
    try {
      const response = await fetch(`/api/channels/${channelId}/messages?page=${page}&limit=20`);
      const data = await response.json();
      setMessages(prev => [...prev, ...data]);
      setHasMore(data.length > 0);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const handleCreateChannel = async () => {
    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChannelName }),
        credentials: 'include',
      });
      const newChannel = await response.json();
      setChannels([...channels, newChannel]);
      setCurrentChannel(newChannel);
      setOpenNewChannelDialog(false);
      setNewChannelName('');
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const handleSendMessage = () => {
    if (messageInput.trim() && currentChannel) {
      socketRef.current.emit('sendMessage', {
        channelId: currentChannel.id,
        content: messageInput,
        userId: user.id,
      }, (newMessage) => {
        if (!newMessage.error) {
            setMessages((prev) => [...prev, newMessage]);
        }
      });
      setMessageInput('');
    }
  };

  const handleSendThreadMessage = (threadMessage) => {
    if (threadMessage.trim() && currentThread) {
        socketRef.current.emit('sendMessage', {
            channelId: currentChannel.id,
            content: threadMessage,
            userId: user.id,
            parent_message_id: currentThread.id,
        }, (newMessage) => {
            if (!newMessage.error) {
                setThreadMessages((prev) => [...prev, newMessage]);
            }
        });
    }
  };

  const openThread = async (message) => {
    setCurrentThread(message);
    try {
        const response = await fetch(`/api/messages/${message.id}/thread`);
        const data = await response.json();
        setThreadMessages(data);
    } catch (error) {
        console.error('Failed to fetch thread messages:', error);
    }
  };

  const closeThread = () => {
    setCurrentThread(null);
    setThreadMessages([]);
  };

  const handleLogout = async () => {
    await logout();
  };

  const renderMainChat = () => (
    <Grid item xs={9} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
        {messages.map((msg) => (
            <Paper key={msg.id} elevation={1} sx={{ p: 2, mb: 2 }}>
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                {msg.user_id} - {new Date(msg.created_at).toLocaleString()}
            </Typography>
            <Typography variant="body1">{msg.content}</Typography>
            <IconButton size="small" onClick={() => openThread(msg)}>
                <ReplyIcon />
            </IconButton>
            {threadRepliesCount[msg.id] > 0 && (
                <Button size="small" onClick={() => openThread(msg)}>
                    {threadRepliesCount[msg.id]}件の返信
                </Button>
            )}
            </Paper>
        ))}
        <div ref={messagesEndRef} />
        </Box>
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
        <TextField
            fullWidth
            variant="outlined"
            placeholder="メッセージを入力..."
            size="small"
            sx={{ mr: 1 }}
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            onKeyPress={(e) => {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
            }}
        />
        <IconButton color="primary" aria-label="send message" onClick={handleSendMessage}>
            <SendIcon />
        </IconButton>
        </Box>
    </Grid>
  );

  const renderThreadView = () => (
    <Grid item xs={9} sx={{ display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
            <IconButton onClick={closeThread}>
                <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" sx={{ ml: 1 }}>スレッド</Typography>
        </Box>
        <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
            {currentThread && (
                <Paper elevation={1} sx={{ p: 2, mb: 2, backgroundColor: '#f0f0f0' }}>
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                        {currentThread.user_id} - {new Date(currentThread.created_at).toLocaleString()}
                    </Typography>
                    <Typography variant="body1">{currentThread.content}</Typography>
                </Paper>
            )}
            <Divider>返信</Divider>
            {threadMessages.map((msg) => (
                <Paper key={msg.id} elevation={1} sx={{ p: 2, mt: 2 }}>
                    <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                        {msg.user_id} - {new Date(msg.created_at).toLocaleString()}
                    </Typography>
                    <Typography variant="body1">{msg.content}</Typography>
                </Paper>
            ))}
            <div ref={messagesEndRef} />
        </Box>
        <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
            <TextField
                fullWidth
                variant="outlined"
                placeholder="返信を入力..."
                size="small"
                onKeyPress={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                        handleSendThreadMessage(e.target.value);
                        e.target.value = '';
                    }
                }}
            />
        </Box>
    </Grid>
  );

  return (
    <Box sx={{ flexGrow: 1, height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            NexSync - {currentChannel ? `# ${currentChannel.name}` : 'チャンネルを選択'}
          </Typography>
          {user && (
            <Button color="inherit" onClick={handleLogout}>
              ログアウト
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1, overflow: 'hidden' }}>
        <Grid item xs={3} sx={{ borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">チャンネル</Typography>
            <IconButton onClick={() => setOpenNewChannelDialog(true)}>
              <AddCircleOutlineIcon />
            </IconButton>
          </Box>
          <List dense sx={{ overflowY: 'auto', flexGrow: 1 }}>
            {channels.map((channel) => (
              <ListItemButton key={channel.id} selected={currentChannel?.id === channel.id} onClick={() => setCurrentChannel(channel)}>
                <ListItemText primary={`# ${channel.name}`} />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="h6">ユーザー情報</Typography>
            <Typography variant="body1">ユーザー名: {user ? user.username : 'ゲスト'}</Typography>
          </Box>
        </Grid>

        {currentThread ? renderThreadView() : renderMainChat()}

      </Grid>

      <Dialog open={openNewChannelDialog} onClose={() => setOpenNewChannelDialog(false)}>
        <DialogTitle>新しいチャンネルを作成</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" id="name" label="チャンネル名" type="text" fullWidth variant="standard" value={newChannelName} onChange={(e) => setNewChannelName(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewChannelDialog(false)}>キャンセル</Button>
          <Button onClick={handleCreateChannel}>作成</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatPage;
