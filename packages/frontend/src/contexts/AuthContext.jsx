
import React, { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // アプリケーションのロード時にセッションを確認
        const checkLoggedIn = async () => {
            try {
                const { data } = await axios.get('/api/auth/me');
                setUser(data);
            } catch (error) {
                setUser(null);
            }
            setLoading(false);
        };
        checkLoggedIn();
    }, []);

    const login = async (username, password) => {
        const { data } = await axios.post('/api/auth/login', { username, password });
        setUser(data.user);
        return data;
    };

    const register = async (username, password, adminKey) => {
        return await axios.post('/api/auth/register', { username, password, adminKey });
    };

    const logout = async () => {
        await axios.post('/api/auth/logout');
        setUser(null);
    };

    const value = {
        user,
        loading,
        login,
        register,
        logout,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    return useContext(AuthContext);
};
