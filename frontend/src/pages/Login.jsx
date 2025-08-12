import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './AuthForm.css';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email || !password) {
            setError('Please fill in all fields');
            setIsLoading(false);
            return;
        }

        try {
            const result = await login(email, password);
            if (!result.success) {
                if (result.message.includes('Too many failed login attempts') || result.message.includes('Account locked')) {
                    setError(result.message);
                    if (email) {
                        navigate('/login-with-otp', { state: { email: email, fromLockedAccount: true } });
                    }
                } else {
                    setError(result.message);
                }
            }
        } catch (backendError) {
            console.error("Login failed (network/unhandled error):", backendError);
            setError("An unexpected error occurred. Please try again later.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Login</h2>
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
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Logging In...' : 'Login'}
                    </button>
                </form>
                <p className="auth-switch-link">
                    Don't have an account? <Link to="/register">Register here</Link>
                </p>
                <p className="forgot-password-link">
                    <Link to="/forgot-password">Forgot Password?</Link>
                </p>
                <p className="login-with-otp-link">
                    <Link to="/login-with-otp">Login with OTP</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;