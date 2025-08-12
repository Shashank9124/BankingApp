import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import API from '../api/axiosConfig';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [notifications, setNotifications] = useState([]);

    const fetchNotifications = useCallback(async () => {
        if (!user || loading) {
            setNotifications([]);
            return;
        }
        try {
            const res = await API.get('/auth/notifications');
            setNotifications(res.data);
        } catch (err) {
            console.error('Failed to fetch notifications:', err);
        }
    }, [user, loading]);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        if (user && !loading) {
            fetchNotifications();
        }
    }, [user, loading, fetchNotifications]);

    const login = async (email, password) => {
        try {
            const res = await API.post('/auth/login', { email, password });
            if (res.data.token) {
                localStorage.setItem('user', JSON.stringify(res.data));
                setUser(res.data);
                return { success: true, user: res.data };
            }
            return { success: false, message: res.data.message, ...res.data };
        } catch (error) {
            console.error('Login error:', error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || 'Login failed', ...error.response?.data };
        }
    };

    const register = async (fullName, email, mobileNumber, password, accountType) => {
        try {
            const res = await API.post('/auth/register', { fullName, email, mobileNumber, password, accountType });
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
            return { success: true };
        } catch (error) {
            console.error('Registration error:', error.response?.data?.message || error.message);
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('user');
        setUser(null);
        setNotifications([]);
    };

    const isAdmin = user && user.role === 'admin';
    const hasTransactionPin = user && user.hasTransactionPin;
    const unreadCount = notifications.filter(n => !n.read).length;
    
    const totalBalance = user?.accounts?.reduce((sum, account) => sum + account.balance, 0) || 0;

    const markAsRead = async () => {
        try {
            await API.put('/auth/notifications/read');
            setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        } catch (err) {
            console.error('Failed to mark notifications as read:', err);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            setUser,
            isAdmin,
            hasTransactionPin,
            notifications,
            unreadCount,
            markAsRead,
            fetchNotifications,
            accounts: user?.accounts || [],
            totalBalance,
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);