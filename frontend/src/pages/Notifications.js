import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './Notifications.css';

const Notifications = () => {
    const { notifications, loading, fetchNotifications, markAsRead } = useAuth();

    useEffect(() => {
        if (!loading && notifications.length > 0) {
            markAsRead(); // Mark all notifications as read when the page is opened
        }
    }, [loading, notifications.length, markAsRead]); // Added notifications.length as dependency

    if (loading) {
        return <Spinner />;
    }

    return (
        <div className="notifications-container">
            <div className="notifications-card">
                <h2>Your Notifications</h2>
                {notifications.length === 0 ? (
                    <p className="no-notifications">You have no notifications.</p>
                ) : (
                    <ul className="notification-list">
                        {notifications.map(n => (
                            <li key={n._id} className={`notification-item ${n.read ? 'read' : 'unread'}`}>
                                <div className="notification-header">
                                    <span className="notification-title">{n.title}</span>
                                    <span className="notification-date">{new Date(n.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="notification-message">
                                    {n.message}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Notifications;