import React, { useState } from 'react';
import API from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './AuthForm.css';

const SetTransactionPin = () => {
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { setUser } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        if (pin !== confirmPin) {
            setError('PINs do not match.');
            setIsLoading(false);
            return;
        }

        if (!/^\d{4}$/.test(pin) && !/^\d{6}$/.test(pin)) {
            setError('PIN must be 4 or 6 digits long.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await API.post('/auth/set-transaction-pin', { pin, confirmPin });
            setMessage(res.data.message);
            setError('');
            setPin('');
            setConfirmPin('');

            setUser(prevUser => ({ ...prevUser, hasTransactionPin: res.data.hasTransactionPin }));

            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (err) {
            console.error('Set PIN error:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to set transaction PIN.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Set Transaction PIN</h2>
                <p className="auth-description">Choose a 4 or 6 digit PIN for your transactions.</p>
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="pin">New Transaction PIN</label>
                        <input
                            type="password"
                            id="pin"
                            value={pin}
                            onChange={(e) => setPin(e.target.value)}
                            maxLength="6"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmPin">Confirm New Transaction PIN</label>
                        <input
                            type="password"
                            id="confirmPin"
                            value={confirmPin}
                            onChange={(e) => setConfirmPin(e.target.value)}
                            maxLength="6"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Setting PIN...' : 'Set PIN'}
                    </button>
                </form>
                <p className="auth-switch-link">
                    <button onClick={() => navigate('/profile')} className="btn btn-secondary" style={{ backgroundColor: 'var(--secondary-color)', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '4px', cursor: 'pointer' }}>
                        Back to Profile
                    </button>
                </p>
            </div>
        </div>
    );
};

export default SetTransactionPin;