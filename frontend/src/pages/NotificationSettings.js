import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { useNavigate } from 'react-router-dom';
import Spinner from '../components/Spinner';
import './NotificationSettings.css';
import './AuthForm.css';

const NotificationSettings = () => {
    const [settings, setSettings] = useState({
        transactionConfirmations: { enabled: true },
        lowBalanceAlert: { enabled: true, threshold: 1000 },
        newLoginAlert: { enabled: true },
        incorrectPinAttemptAlert: { enabled: true },
        passwordChangeAlert: { enabled: true },
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetching, setIsFetching] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await API.get('/notifications/settings');
                setSettings(res.data);
            } catch (err) {
                console.error('Error fetching notification settings:', err.response?.data?.message || err.message);
                setError(err.response?.data?.message || 'Failed to load notification settings.');
            } finally {
                setIsFetching(false);
            }
        };
        fetchSettings();
    }, []);

    const handleToggleChange = (alertType) => {
        setSettings(prevSettings => ({
            ...prevSettings,
            [alertType]: {
                ...prevSettings[alertType],
                enabled: !prevSettings[alertType].enabled,
            },
        }));
    };

    const handleThresholdChange = (e) => {
        const value = parseFloat(e.target.value);
        setSettings(prevSettings => ({
            ...prevSettings,
            lowBalanceAlert: {
                ...prevSettings.lowBalanceAlert,
                threshold: isNaN(value) ? '' : value,
            },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        if (settings.lowBalanceAlert.enabled && (settings.lowBalanceAlert.threshold === '' || isNaN(settings.lowBalanceAlert.threshold) || settings.lowBalanceAlert.threshold < 0)) {
            setError('Low balance threshold must be a non-negative number.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await API.put('/notifications/settings', settings);
            setMessage(res.data.message);
            setError('');
        } catch (err) {
            console.error('Error updating notification settings:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Failed to update settings.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isFetching) {
        return <Spinner />;
    }

    return (
        <div className="settings-container">
            <div className="settings-card">
                <h2>Notification Settings</h2>
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                <form onSubmit={handleSubmit} className="settings-form">
                    <div className="settings-group">
                        <h3>Transaction Alerts</h3>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                id="transactionConfirmations"
                                checked={settings.transactionConfirmations.enabled}
                                onChange={() => handleToggleChange('transactionConfirmations')}
                                disabled={isLoading}
                            />
                            <label htmlFor="transactionConfirmations">Email me transaction confirmations (Deposit, Withdrawal, Transfer)</label>
                        </div>
                    </div>

                    <div className="settings-group">
                        <h3>Balance Alerts</h3>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                id="lowBalanceAlertEnabled"
                                checked={settings.lowBalanceAlert.enabled}
                                onChange={() => handleToggleChange('lowBalanceAlert')}
                                disabled={isLoading}
                            />
                            <label htmlFor="lowBalanceAlertEnabled">Email me Low Balance Alerts</label>
                        </div>
                        {settings.lowBalanceAlert.enabled && (
                            <div className="form-group settings-indent">
                                <label htmlFor="lowBalanceThreshold">Threshold Amount (₹)</label>
                                <input
                                    type="number"
                                    id="lowBalanceThreshold"
                                    value={settings.lowBalanceAlert.threshold}
                                    onChange={handleThresholdChange}
                                    min="0"
                                    step="1"
                                    required
                                    disabled={isLoading}
                                />
                            </div>
                        )}
                    </div>

                    <div className="settings-group">
                        <h3>Security Alerts</h3>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                id="newLoginAlert"
                                checked={settings.newLoginAlert.enabled}
                                onChange={() => handleToggleChange('newLoginAlert')}
                                disabled={isLoading}
                            />
                            <label htmlFor="newLoginAlert">Email me New Login Alerts</label>
                        </div>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                id="incorrectPinAttemptAlert"
                                checked={settings.incorrectPinAttemptAlert.enabled}
                                onChange={() => handleToggleChange('incorrectPinAttemptAlert')}
                                disabled={isLoading}
                            />
                            <label htmlFor="incorrectPinAttemptAlert">Email me Incorrect Transaction PIN Attempt Alerts</label>
                        </div>
                        <div className="form-check">
                            <input
                                type="checkbox"
                                id="passwordChangeAlert"
                                checked={settings.passwordChangeAlert.enabled}
                                onChange={() => handleToggleChange('passwordChangeAlert')}
                                disabled={isLoading}
                            />
                            <label htmlFor="passwordChangeAlert">Email me Password Change Alerts</label>
                        </div>
                    </div>

                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Saving Settings...' : 'Save Settings'}
                    </button>
                    <button type="button" onClick={() => navigate('/profile')} className="btn btn-secondary settings-back-btn">
                        Back to Profile
                    </button>
                </form>
            </div>
        </div>
    );
};

export default NotificationSettings;