import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  Grid,
  Paper,
  List,
  ListItem,
  ListItemText,
  TextField,
  IconButton,
  Drawer,
  Divider,
} from '@mui/material';

import SendIcon from '@mui/icons-material/Send';
import InfoIcon from '@mui/icons-material/Info';

const ChatPage = () => {
  const { user, logout } = useAuth();
  const [isRightSidebarOpen, setRightSidebarOpen] = useState(false);

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
            NexSync
          </Typography>
          {user && (
            <Button color="inherit" onClick={handleLogout}>
              ログアウト
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Grid container sx={{ flexGrow: 1 }}>
        {/* 左カラム: チャンネル一覧とユーザー情報 */}
        <Grid item xs={3} sx={{ borderRight: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e0e0e0' }}>
            <Typography variant="h6">チャンネル</Typography>
            <List dense>
              <ListItem button>
                <ListItemText primary="# general" />
              </ListItem>
              <ListItem button>
                <ListItemText primary="# random" />
              </ListItem>
              <ListItem button>
                <ListItemText primary="# development" />
              </ListItem>
            </List>
          </Box>
          <Box sx={{ p: 2, mt: 'auto', borderTop: '1px solid #e0e0e0' }}>
            <Typography variant="h6">ユーザー情報</Typography>
            <Typography variant="body1">ユーザー名: {user ? user.username : 'ゲスト'}</Typography>
            {/* その他のユーザー情報 */}
          </Box>
        </Grid>

        {/* 中央カラム: メッセージ表示と入力フォーム */}
        <Grid item xs={9} sx={{ display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ flexGrow: 1, p: 2, overflowY: 'auto' }}>
            {/* メッセージ表示エリア */}
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="body2">メッセージ1...</Typography>
            </Paper>
            <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
              <Typography variant="body2">メッセージ2...</Typography>
            </Paper>
            {/* ...その他のメッセージ */}
          </Box>
          <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="メッセージを入力..."
              size="small"
              sx={{ mr: 1 }}
            />
            <IconButton color="primary" aria-label="send message">
              <SendIcon />
            </IconButton>
            <IconButton color="default" aria-label="toggle right sidebar" onClick={toggleRightSidebar}>
              <InfoIcon />
            </IconButton>
          </Box>
        </Grid>
      </Grid>

      {/* 右カラム: スレッド/ファイル詳細 (Drawer) */}
      <Drawer
        anchor="right"
        open={isRightSidebarOpen}
        onClose={toggleRightSidebar}
        PaperProps={{
          sx: { width: 300 }, // 右カラムの幅
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>スレッド / ファイル詳細</Typography>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="body2">ここにスレッドのメッセージや、選択されたファイルのプレビュー・詳細が表示されます。</Typography>
          <Button onClick={toggleRightSidebar} sx={{ mt: 2 }}>閉じる</Button>
        </Box>
      </Drawer>
    </Box>
  );
};

export default ChatPage;