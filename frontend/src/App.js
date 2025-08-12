import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Deposit from './pages/Deposit';
import Withdraw from './pages/Withdraw';
import TransferFunds from './pages/TransferFunds';
import TransactionHistory from './pages/TransactionHistory';
import Profile from './pages/Profile';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import LoginWithOtp from './pages/LoginWithOtp';
import ChangePassword from './pages/ChangePassword';
import SetTransactionPin from './pages/SetTransactionPin';
import ChangeTransactionPin from './pages/ChangeTransactionPin';
import NotificationSettings from './pages/NotificationSettings';
import SpendingAnalytics from './pages/SpendingAnalytics';
import ActivityLog from './pages/ActivityLog';
import Notifications from './pages/Notifications';

function App() {
    return (
        <Router>
            <Navbar />
            <main className="container">
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/login-with-otp" element={<LoginWithOtp />} />
                    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/deposit" element={<PrivateRoute><Deposit /></PrivateRoute>} />
                    <Route path="/withdraw" element={<PrivateRoute><Withdraw /></PrivateRoute>} />
                    <Route path="/transfer" element={<PrivateRoute><TransferFunds /></PrivateRoute>} />
                    <Route path="/history" element={<PrivateRoute><TransactionHistory /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                    <Route path="/change-password" element={<PrivateRoute><ChangePassword /></PrivateRoute>} />
                    <Route path="/set-transaction-pin" element={<PrivateRoute><SetTransactionPin /></PrivateRoute>} />
                    <Route path="/change-transaction-pin" element={<PrivateRoute><ChangeTransactionPin /></PrivateRoute>} />
                    <Route path="/notification-settings" element={<PrivateRoute><NotificationSettings /></PrivateRoute>} />
                    <Route path="/analytics" element={<PrivateRoute><SpendingAnalytics /></PrivateRoute>} />
                    <Route path="/activity-log" element={<PrivateRoute><ActivityLog /></PrivateRoute>} />
                    <Route path="/notifications" element={<PrivateRoute><Notifications /></PrivateRoute>} />
                    <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                </Routes>
            </main>
        </Router>
    );
}

export default App;