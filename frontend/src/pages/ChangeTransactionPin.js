import React, { useState } from 'react';
import API from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import './AuthForm.css';

const ChangeTransactionPin = () => {
    const [currentPin, setCurrentPin] = useState('');
    const [newPin, setNewPin] = useState('');
    const [confirmNewPin, setConfirmNewPin] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        if (newPin !== confirmNewPin) {
            setError('New PINs do not match.');
            setIsLoading(false);
            return;
        }

        if (!/^\d{4}$/.test(newPin) && !/^\d{6}$/.test(newPin)) {
            setError('New PIN must be 4 or 6 digits long.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await API.put('/auth/change-transaction-pin', {
                currentPin,
                newPin,
                confirmNewPin,
            });
            setMessage(res.data.message);
            setError('');
            setCurrentPin('');
            setNewPin('');
            setConfirmNewPin('');

            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (err) {
            console.error('Change PIN error:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to change transaction PIN.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Change Transaction PIN</h2>
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="currentPin">Current Transaction PIN</label>
                        <input
                            type="password"
                            id="currentPin"
                            value={currentPin}
                            onChange={(e) => setCurrentPin(e.target.value)}
                            maxLength="6"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="newPin">New Transaction PIN</label>
                        <input
                            type="password"
                            id="newPin"
                            value={newPin}
                            onChange={(e) => setNewPin(e.target.value)}
                            maxLength="6"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="confirmNewPin">Confirm New Transaction PIN</label>
                        <input
                            type="password"
                            id="confirmNewPin"
                            value={confirmNewPin}
                            onChange={(e) => setConfirmNewPin(e.target.value)}
                            maxLength="6"
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Changing PIN...' : 'Change PIN'}
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

export default ChangeTransactionPin;