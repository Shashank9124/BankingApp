import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axiosConfig';
import NotificationsDropdown from './NotificationsDropdown';
import './Navbar.css';

const Navbar = () => {
    const { user, logout, isAdmin } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await API.post('/auth/logout');
        } catch (error) {
            console.error('Error logging out:', error);
        }
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">Banking App</Link>
                <ul className="navbar-nav">
                    {user ? (
                        <>
                            <li><Link to="/dashboard">Dashboard</Link></li>
                            <li><Link to="/deposit">Deposit</Link></li>
                            <li><Link to="/withdraw">Withdraw</Link></li>
                            <li><Link to="/transfer">Transfer</Link></li>
                            <li><Link to="/history">History</Link></li>
                            <li><Link to="/profile">Profile</Link></li>
                            <li><Link to="/analytics">Analytics</Link></li>
                            <NotificationsDropdown />
                            {isAdmin && <li><Link to="/admin">Admin Panel</Link></li>}
                            <li>
                                <button onClick={handleLogout} className="nav-btn">Logout</button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li><Link to="/login">Login</Link></li>
                            <li><Link to="/register">Register</Link></li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;