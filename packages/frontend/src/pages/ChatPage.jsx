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
  Drawer,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';

import SendIcon from '@mui/icons-material/Send';
import InfoIcon from '@mui/icons-material/Info';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

const ChatPage = () => {
  const { user, logout } = useAuth();
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [openNewChannelDialog, setOpenNewChannelDialog] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
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
    }

    return () => {
      if (currentChannel) {
        socketRef.current.emit('leaveChannel', currentChannel.id);
      }
    };
  }, [currentChannel]);

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

  const handleLogout = async () => {
    await logout();
  };

  const toggleRightSidebar = () => {
    setRightSidebarOpen(!isRightSidebarOpen);
  };

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

        <Grid item xs={9} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
            {messages.map((msg) => (
              <Paper key={msg.id} elevation={1} sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2">{msg.content}</Typography>
              </Paper>
            ))}
          </Box>
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
            <TextField fullWidth variant="outlined" placeholder="メッセージを入力..." size="small" sx={{ mr: 1 }} />
            <IconButton color="primary" aria-label="send message">
              <SendIcon />
            </IconButton>
            <IconButton color="default" aria-label="toggle right sidebar" onClick={toggleRightSidebar}>
              <InfoIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

      <Drawer anchor="right" open={isRightSidebarOpen} onClose={toggleRightSidebar} PaperProps={{ sx: { width: 300 } }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>スレッド / ファイル詳細</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2">ここにスレッドのメッセージや、選択されたファイルのプレビュー・詳細が表示されます。</Typography>
          <Button onClick={toggleRightSidebar} sx={{ mt: 2 }}>閉じる</Button>
        </Box>
      </Drawer>

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
