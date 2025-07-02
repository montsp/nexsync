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
  CircularProgress,
  Menu,
  MenuItem,
  Chip,
} from '@mui/material';

import SendIcon from '@mui/icons-material/Send';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import ReplyIcon from '@mui/icons-material/Reply';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import MoodIcon from '@mui/icons-material/Mood';

const Mention = ({ children }) => (
    <span style={{ backgroundColor: '#e0e0ff', fontWeight: 'bold', borderRadius: '4px', padding: '2px 4px' }}>
        @{children}
    </span>
);

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
  const [isUploading, setIsUploading] = useState(false);
  
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingContent, setEditingContent] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMessageId, setSelectedMessageId] = useState(null);

  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const threadFileInputRef = useRef(null);

  const fileMessageRegex = /^\[file:(.+?):(.+?)\]$/;

  useEffect(() => {
    socketRef.current = io('http://localhost:3001');

    socketRef.current.on('connect', () => console.log('Connected to socket server'));

    socketRef.current.on('new_message', (message) => {
      console.log('Received new_message:', message);
      if (message.parent_message_id) {
        if (currentThread && message.parent_message_id === currentThread.id) {
            setThreadMessages((prev) => [...prev, message]);
        }
        setThreadRepliesCount(prev => ({
            ...prev,
            [message.parent_message_id]: (prev[message.parent_message_id] || 0) + 1
        }));
      } else {
        setMessages((prev) => [...prev, message]);
      }
    });

    socketRef.current.on('message_updated', (updatedMessage) => {
        console.log('Received message_updated:', updatedMessage);
        setMessages((prev) => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
        setThreadMessages((prev) => prev.map(m => m.id === updatedMessage.id ? updatedMessage : m));
    });

    socketRef.current.on('message_deleted', ({ id }) => {
        console.log('Received message_deleted:', id);
        setMessages((prev) => prev.filter(m => m.id !== id));
        setThreadMessages((prev) => prev.filter(m => m.id !== id));
    });

    fetchChannels();

    return () => {
      socketRef.current.disconnect();
    };
  }, [currentThread]);

  useEffect(() => {
    if (currentChannel) {
      setMessages([]);
      setPage(1);
      setHasMore(true);
      fetchMessages(currentChannel.id, 1);
      if (socketRef.current.connected) {
        socketRef.current.emit('joinChannel', currentChannel.id.toString());
      }
      setCurrentThread(null);
    }

    return () => {
      if (currentChannel && socketRef.current.connected) {
        socketRef.current.emit('leaveChannel', currentChannel.id.toString());
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
      if (page === 1) {
        setMessages(data.reverse());
      } else {
        setMessages(prev => [...data.reverse(), ...prev]);
      }
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

  const handleSendMessage = async (content, parentId = null) => {
    if (!content.trim() || !currentChannel) return;

    try {
        await fetch('/api/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel_id: currentChannel.id,
                content: content,
                parent_message_id: parentId,
            }),
        });
    } catch (error) {
        console.error('Failed to send message:', error);
    }
  };

  const handleToggleReaction = async (messageId, emoji) => {
    try {
        await fetch(`/api/messages/${messageId}/toggle-reaction`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emoji }),
        });
    } catch (error) {
        console.error('Failed to toggle reaction:', error);
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingContent.trim() || !editingMessageId) return;
    try {
        await fetch(`/api/messages/${editingMessageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: editingContent }),
        });
        cancelEditing();
    } catch (error) {
        console.error('Failed to update message:', error);
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('本当にこのメッセージを削除しますか？')) {
        try {
            await fetch(`/api/messages/${messageId}`, {
                method: 'DELETE',
            });
        } catch (error) {
            console.error('Failed to delete message:', error);
        }
    }
  };

  const startEditing = (message) => {
    setEditingMessageId(message.id);
    setEditingContent(message.content);
    handleMenuClose();
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setEditingContent('');
  };

  const handleMenuOpen = (event, messageId) => {
    setAnchorEl(event.currentTarget);
    setSelectedMessageId(messageId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedMessageId(null);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleFileUpload = async (event, isThread) => {
    const file = event.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('File upload failed');

      const { fileId, fileName } = await response.json();
      const fileMessage = `[file:${fileId}:${fileName}]`;

      if (isThread) {
        handleSendMessage(fileMessage, currentThread.id);
      } else {
        handleSendMessage(fileMessage);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setIsUploading(false);
      event.target.value = null;
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

  const renderMessageContent = (msg) => {
    const fileMatch = msg.content.match(fileMessageRegex);
    if (fileMatch) {
        return (
            <Box>
                <Typography variant="body1" sx={{ mb: 1 }}>
                    <strong>ファイル共有:</strong> {fileMatch[2]}
                </Typography>
                <Button 
                    variant="outlined" 
                    size="small"
                    href={`/api/files/download/${fileMatch[1]}`}
                    download
                    sx={{ mr: 1 }}
                >
                    ダウンロード
                </Button>
                <Box mt={2} sx={{ border: '1px solid #e0e0e0', borderRadius: '4px', overflow: 'hidden' }}>
                    <iframe 
                        src={`/api/files/view/${fileMatch[1]}`}
                        width="100%"
                        height="400px"
                        frameBorder="0"
                        title={fileMatch[2]}
                    ></iframe>
                </Box>
            </Box>
        );
    }

    const contentWithMentions = msg.content.split(/(@\w+)/g).map((part, index) => {
        if (part.startsWith('@')) {
            const username = part.substring(1);
            if (username === user.username) {
                return <Mention key={index}>{username}</Mention>;
            }
        }
        return part;
    });

    return <Typography variant="body1">{contentWithMentions}</Typography>;
  };

  const renderMessage = (msg, isThread = false) => {
    const isEditing = editingMessageId === msg.id;
    const isAuthor = msg.user_id === user.id;
    
    const aggregatedReactions = (msg.reactions || []).reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = { count: 0, users: [] };
        }
        acc[reaction.emoji].count++;
        acc[reaction.emoji].users.push(reaction.user_id);
        return acc;
    }, {});

    return (
        <Paper key={msg.id} elevation={1} sx={{ p: 2, mb: 2, position: 'relative' }}>
            <Typography variant="caption" display="block" sx={{ color: 'text.secondary' }}>
                {msg.user_id} - {new Date(msg.created_at).toLocaleString()} {msg.is_edited && '(編集済み)'}
            </Typography>

            {isEditing ? (
                <Box>
                    <TextField
                        fullWidth
                        variant="outlined"
                        size="small"
                        value={editingContent}
                        onChange={(e) => setEditingContent(e.target.value)}
                    />
                    <Button size="small" onClick={handleUpdateMessage}>保存</Button>
                    <Button size="small" onClick={cancelEditing}>キャンセル</Button>
                </Box>
            ) : (
                renderMessageContent(msg)
            )}

            <Box sx={{ mt: 1, display: 'flex', gap: 0.5 }}>
                {Object.entries(aggregatedReactions).map(([emoji, data]) => (
                    <Chip
                        key={emoji}
                        icon={<Typography>{emoji}</Typography>}
                        label={data.count}
                        onClick={() => handleToggleReaction(msg.id, emoji)}
                        size="small"
                        variant={data.users.includes(user.id) ? "filled" : "outlined"}
                    />
                ))}
            </Box>

            <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                <IconButton size="small" onClick={() => handleToggleReaction(msg.id, '👍')}>
                    <MoodIcon />
                </IconButton>
                {!isThread && (
                    <IconButton size="small" onClick={() => openThread(msg)}>
                        <ReplyIcon />
                    </IconButton>
                )}
                {isAuthor && (
                    <IconButton size="small" onClick={(e) => handleMenuOpen(e, msg.id)}>
                        <MoreVertIcon />
                    </IconButton>
                )}
            </Box>
            
            {!isThread && threadRepliesCount[msg.id] > 0 && (
                <Button size="small" onClick={() => openThread(msg)}>
                    {threadRepliesCount[msg.id]}件の返信
                </Button>
            )}
        </Paper>
    );
  };

  const renderMainChat = () => {
    return (
        <Grid item xs={9} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                {messages.map((msg) => renderMessage(msg))}
                <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={(e) => handleFileUpload(e, false)}
                />
                <IconButton onClick={() => fileInputRef.current.click()} disabled={isUploading}>
                    {isUploading ? <CircularProgress size={24} /> : <AttachFileIcon />}
                </IconButton>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="メッセージを入力... (@でメンション)"
                    size="small"
                    sx={{ mr: 1 }}
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(messageInput);
                            setMessageInput('');
                        }
                    }}
                />
                <IconButton color="primary" onClick={() => { handleSendMessage(messageInput); setMessageInput(''); }}>
                    <SendIcon />
                </IconButton>
            </Box>
        </Grid>
    );
  };

  const renderThreadView = () => {
    return (
        <Grid item xs={9} sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                <IconButton onClick={closeThread}>
                    <ArrowBackIcon />
                </IconButton>
                <Typography variant="h6" sx={{ ml: 1 }}>スレッド</Typography>
            </Box>
            <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
                {currentThread && renderMessage(currentThread, true)}
                <Divider>返信</Divider>
                {threadMessages.map((msg) => renderMessage(msg, true))}
                <div ref={messagesEndRef} />
            </Box>
            <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
                <input 
                    type="file" 
                    ref={threadFileInputRef} 
                    style={{ display: 'none' }} 
                    onChange={(e) => handleFileUpload(e, true)}
                />
                <IconButton onClick={() => threadFileInputRef.current.click()} disabled={isUploading}>
                    {isUploading ? <CircularProgress size={24} /> : <AttachFileIcon />}
                </IconButton>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="返信を入力..."
                    size="small"
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(e.target.value, currentThread.id);
                            e.target.value = '';
                        }
                    }}
                />
            </Box>
        </Grid>
    );
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

      <Grid container sx={{ flexGrow: 1, overflow: 'hidden', height: 'calc(100vh - 64px)' }}>
        <Grid item xs={3} sx={{ borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column', height: '100%' }}>
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

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => startEditing(messages.find(m => m.id === selectedMessageId) || threadMessages.find(m => m.id === selectedMessageId))}>
            編集
        </MenuItem>
        <MenuItem onClick={() => { handleDeleteMessage(selectedMessageId); handleMenuClose(); }}>
            削除
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default ChatPage;
