import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './Dashboard.css';

const Dashboard = () => {
    const { user, accounts, totalBalance, setUser } = useAuth();
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            if (!user) {
                setLoading(false);
                return;
            }
            try {
                const res = await API.get('/transactions/dashboard');
                setTransactions(res.data.transactions);
                // Update accounts in global state if they changed (e.g., balance update)
                if (JSON.stringify(accounts) !== JSON.stringify(res.data.accounts)) {
                    setUser(prevUser => ({
                        ...prevUser,
                        accounts: res.data.accounts
                    }));
                }
            }
            catch (err) {
                console.error('Failed to fetch dashboard data:', err);
                setError('Failed to load dashboard data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, [user, accounts, setUser]); // Added accounts to dependency array to re-fetch if accounts change

    if (loading) {
        return <Spinner />;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    if (!user) {
        return <div className="dashboard-message">Please log in to view your dashboard.</div>;
    }

    return (
        <div className="dashboard-container">
            <h2 className="dashboard-header">Welcome, {user.fullName}!</h2>
            <div className="total-balance-card balance-card">
                <h3>Total Net Worth</h3>
                <p className="balance-amount">₹{totalBalance.toFixed(2)}</p>
            </div>

            <div className="accounts-section">
                <h3>Your Accounts ({accounts.length})</h3>
                {accounts.length === 0 ? (
                    <p>No accounts found.</p>
                ) : (
                    <div className="account-list-container">
                        {accounts.map(acc => (
                            <div key={acc._id} className="account-item-card">
                                <h4>{acc.accountType}</h4>
                                <p><strong>Account No:</strong> {acc.accountNumber}</p>
                                <p className="account-balance-display"><strong>Balance:</strong> ₹{acc.balance.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="transactions-section">
                <h3>Latest Transactions</h3>
                {transactions.length === 0 ? (
                    <p>No transactions yet.</p>
                ) : (
                    <ul className="transaction-list">
                        {transactions.map((txn) => (
                            <li key={txn._id} className={`transaction-item transaction-${txn.type}`}>
                                <span className="transaction-type">{txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}</span>
                                <span className="transaction-description">{txn.description}</span>
                                <span className="transaction-amount">₹{txn.amount.toFixed(2)}</span>
                                <span className="transaction-date">{new Date(txn.createdAt).toLocaleDateString()}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default Dashboard;