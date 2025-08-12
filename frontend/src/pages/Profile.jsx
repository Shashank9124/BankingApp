import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import Spinner from '../components/Spinner';
import './Profile.css';
import './AuthForm.css';

const Profile = () => {
    const { user, setUser, hasTransactionPin, accounts } = useAuth();
    const [profileData, setProfileData] = useState({
        fullName: '',
        email: '',
        mobileNumber: '',
        // bankAccountNumber and accountBalance are now derived from accounts
    });
    const [isEditing, setIsEditing] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const res = await API.get('/auth/profile');
                setProfileData(res.data);
                // Update accounts in global state if they changed (e.g., from backend)
                if (JSON.stringify(accounts) !== JSON.stringify(res.data.accounts)) {
                    setUser(prevUser => ({ ...prevUser, accounts: res.data.accounts }));
                }
            } catch (err) {
                console.error('Failed to fetch profile:', err);
                setError(err.response?.data?.message || 'Failed to load profile data.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, [user, accounts, setUser]); // Added accounts to dependency array to re-fetch if accounts change

    const handleEditToggle = () => {
        setIsEditing(!isEditing);
        setMessage('');
        setError('');
    };

    const handleChange = (e) => {
        setProfileData({ ...profileData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');

        try {
            const res = await API.put('/auth/profile', {
                fullName: profileData.fullName,
                mobileNumber: profileData.mobileNumber,
            });
            setMessage(res.data.message);
            setIsEditing(false);

            const updatedUserData = { ...user, ...res.data.user };
            localStorage.setItem('user', JSON.stringify(updatedUserData));
            setUser(updatedUserData); // This will trigger re-render and re-fetch in useEffect

        } catch (err) {
            console.error('Failed to update profile:', err);
            setError(err.response?.data?.message || 'Failed to update profile.');
        }
    };

    if (loading) {
        return <Spinner />;
    }

    if (error && !isEditing) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="profile-container">
            <div className="profile-card">
                <h2>Your Profile Details</h2>
                {message && <div className="alert alert-success">{message}</div>}
                {error && isEditing && <div className="alert alert-danger">{error}</div>}

                {!isEditing ? (
                    <div className="profile-details">
                        <div className="detail-item">
                            <strong>Full Name:</strong> <span>{profileData.fullName}</span>
                        </div>
                        <div className="detail-item">
                            <strong>Email:</strong> <span>{profileData.email}</span>
                        </div>
                        <div className="detail-item">
                            <strong>Mobile Number:</strong> <span>{profileData.mobileNumber}</span>
                        </div>
                        <div className="detail-item">
                            <strong>Number of Accounts:</strong> <span>{accounts.length}</span>
                        </div>
                        <div className="profile-actions">
                            <button onClick={handleEditToggle} className="btn profile-edit-btn">Edit Profile</button>
                            <Link to="/change-password" className="btn profile-change-password-btn">Change Password</Link>
                            {hasTransactionPin ? (
                                <Link to="/change-transaction-pin" className="btn profile-change-password-btn">Change Transaction PIN</Link>
                            ) : (
                                <Link to="/set-transaction-pin" className="btn profile-edit-btn">Set Transaction PIN</Link>
                            )}
                            <Link to="/notification-settings" className="btn profile-change-password-btn">Notification Settings</Link>
                            <Link to="/activity-log" className="btn profile-edit-btn">Activity Log</Link>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="profile-form">
                        <div className="form-group">
                            <label htmlFor="fullName">Full Name</label>
                            <input
                                type="text"
                                id="fullName"
                                name="fullName"
                                value={profileData.fullName}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="mobileNumber">Mobile Number</label>
                            <input
                                type="text"
                                id="mobileNumber"
                                name="mobileNumber"
                                value={profileData.mobileNumber}
                                onChange={handleChange}
                                required
                                pattern="\d{10}"
                                title="Please enter a 10-digit mobile number"
                            />
                        </div>
                        <div className="form-group">
                            <label>Email (Not Editable)</label>
                            <input type="email" value={profileData.email} disabled />
                        </div>
                        <button type="submit" className="btn">Save Changes</button>
                        <button type="button" onClick={handleEditToggle} className="btn btn-danger profile-cancel-btn">Cancel</button>
                    </form>
                )}
            </div>
        </div>
    );
};

export default Profile;