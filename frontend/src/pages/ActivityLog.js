import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import Spinner from '../components/Spinner';
import './ActivityLog.css';
import './AuthForm.css';

const ActivityLog = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchActivityLog = async () => {
            try {
                const res = await API.get('/auth/activity');
                setActivities(res.data);
            } catch (err) {
                console.error('Failed to fetch activity log:', err);
                setError(err.response?.data?.message || 'Failed to load activity log.');
            } finally {
                setLoading(false);
            }
        };

        fetchActivityLog();
    }, []);

    if (loading) {
        return <Spinner />;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="activity-container">
            <div className="activity-card">
                <h2>Account Activity Log</h2>
                {activities.length === 0 ? (
                    <p className="no-activity-message">No recent activity found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="activity-table">
                            <thead>
                                <tr>
                                    <th>Activity</th>
                                    <th>Details</th>
                                    <th>Timestamp</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activities.map((log) => (
                                    <tr key={log._id}>
                                        <td>{log.activityType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}</td>
                                        <td>{JSON.stringify(log.details)}</td>
                                        <td>{new Date(log.timestamp).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ActivityLog;