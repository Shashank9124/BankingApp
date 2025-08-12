import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './NotificationsDropdown.css';

const NotificationsDropdown = () => {
    const { notifications, unreadCount, markAsRead } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const toggleDropdown = () => {
        setIsOpen(!isOpen);
    };

    const handleMarkAsRead = () => {
        markAsRead();
    };

    const recentNotifications = notifications.slice(0, 5); // Show only the 5 most recent

    return (
        <div className="notifications-dropdown-container">
            <div className="notifications-icon" onClick={toggleDropdown}>
                <i className="fa-solid fa-bell"></i>
                {unreadCount > 0 && <span className="unread-count">{unreadCount}</span>}
            </div>
            {isOpen && (
                <div className="notifications-dropdown-menu">
                    <div className="dropdown-header">
                        <h4>Notifications</h4>
                        <Link to="/notifications" onClick={toggleDropdown}>View All</Link>
                    </div>
                    {recentNotifications.length > 0 ? (
                        <>
                            <ul className="dropdown-notification-list">
                                {recentNotifications.map(n => (
                                    <li key={n._id} className={`dropdown-notification-item ${n.read ? 'read' : 'unread'}`}>
                                        <div className="notification-title">{n.title}</div>
                                        <div className="notification-message">{n.message}</div>
                                        <div className="notification-date">{new Date(n.createdAt).toLocaleString()}</div>
                                    </li>
                                ))}
                            </ul>
                            <div className="dropdown-footer">
                                <button onClick={handleMarkAsRead}>Mark All As Read</button>
                            </div>
                        </>
                    ) : (
                        <div className="no-notifications-message">No recent notifications.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationsDropdown;