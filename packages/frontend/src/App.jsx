import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* 認証が必要なルート */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<ChatPage />} />
            {/* 他の認証が必要なルートはここにネストする */}
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;