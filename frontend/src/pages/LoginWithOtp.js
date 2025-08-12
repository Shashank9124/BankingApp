import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './AuthForm.css';

const LoginWithOtp = () => {
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { setUser } = useAuth();

    useEffect(() => {
        if (location.state?.email) {
            setEmail(location.state.email);
            if (location.state.fromLockedAccount) {
                setMessage('Your account is temporarily locked due to too many failed attempts. Please use the OTP sent to your email to log in.');
            }
        }
    }, [location.state]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        if (!email || !otp) {
            setError('Please provide both email and OTP.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await API.post('/auth/login-with-otp', { email, otp });
            setMessage(res.data.message || 'Login successful with OTP!');
            localStorage.setItem('user', JSON.stringify(res.data));
            setUser(res.data);
            
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);

        } catch (err) {
            console.error('OTP login error:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'OTP login failed. Please check your email and OTP.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login with OTP</h2>
                <p className="auth-description">Enter your email and the OTP received after failed login attempts.</p>
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
                            disabled={isLoading || location.state?.email}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="otp">OTP (4-digits)</label>
                        <input
                            type="text"
                            id="otp"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                            maxLength="4"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Logging In...' : 'Login with OTP'}
                    </button>
                </form>
                <p className="auth-switch-link">
                    <Link to="/login">Back to Password Login</Link>
                </p>
                <p className="auth-switch-link">
                    <Link to="/forgot-password">Forgot Password (Request new OTP)</Link>
                </p>
            </div>
        </div>
    );
};

export default LoginWithOtp;