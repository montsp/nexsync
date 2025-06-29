
import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        // セッション確認中は何も表示しないか、ローディングスピナーを表示
        return <div>Loading...</div>;
    }

    return user ? <Outlet /> : <Navigate to="/login" />;
};

export default ProtectedRoute;
