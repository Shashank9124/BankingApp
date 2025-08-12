import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/axiosConfig';
import Spinner from '../components/Spinner';
import './AuthForm.css';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        try {
            const res = await API.post('/auth/forgotpassword', { email });
            setMessage(res.data.message || 'OTP sent to your email. Please check your inbox.');
            setEmail('');
        } catch (err) {
            console.error('Forgot password error:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Forgot Password</h2>
                <p className="auth-description">Enter your registered email to receive an OTP for password reset.</p>
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Sending OTP...' : 'Send OTP'}
                    </button>
                </form>
                <p className="auth-switch-link">
                    Remember your password? <Link to="/login">Login</Link>
                </p>
                <p className="auth-switch-link">
                    Already have an OTP? <Link to="/reset-password">Reset Password</Link>
                </p>
            </div>
        </div>
    );
};

export default ForgotPassword;