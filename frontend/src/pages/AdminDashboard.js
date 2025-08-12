import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import Spinner from '../components/Spinner';
import './AdminDashboard.css';

const AdminDashboard = () => {
    const [users, setUsers] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [loadingTransactions, setLoadingTransactions] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAdminData = async () => {
            try {
                const usersRes = await API.get('/admin/users');
                setUsers(usersRes.data);
                setLoadingUsers(false);

                const transactionsRes = await API.get('/admin/transactions');
                setTransactions(transactionsRes.data);
                setLoadingTransactions(false);

            } catch (err) {
                console.error('Error fetching admin data:', err.response?.data?.message || err.message);
                setError(err.response?.data?.message || 'Failed to load admin data.');
                setLoadingUsers(false);
                setLoadingTransactions(false);
            }
        };

        fetchAdminData();
    }, []);

    if (loadingUsers || loadingTransactions) {
        return <Spinner />;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="admin-dashboard-container">
            <h2>Admin Panel</h2>

            <div className="admin-section">
                <h3>All Users ({users.length})</h3>
                {users.length === 0 ? (
                    <p>No users found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Full Name</th>
                                    <th>Email</th>
                                    <th>Mobile</th>
                                    <th>Role</th>
                                    <th>Registered On</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user._id}>
                                        <td>{user._id.substring(0, 5)}...</td>
                                        <td>{user.fullName}</td>
                                        <td>{user.email}</td>
                                        <td>{user.mobileNumber}</td>
                                        <td>{user.role}</td>
                                        <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="admin-section">
                <h3>All Transactions ({transactions.length})</h3>
                {transactions.length === 0 ? (
                    <p>No transactions found.</p>
                ) : (
                    <div className="table-responsive">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>User</th>
                                    <th>Type</th>
                                    <th>Amount</th>
                                    <th>Category</th>
                                    <th>Account</th>
                                    <th>Recipient</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {transactions.map((txn) => (
                                    <tr key={txn._id}>
                                        <td>{txn._id.substring(0, 5)}...</td>
                                        <td>{txn.user ? `${txn.user.fullName} (${txn.user.email.substring(0,5)}...)` : 'N/A'}</td>
                                        <td>{txn.type}</td>
                                        <td className={`transaction-amount-${txn.type}`}>{txn.amount.toFixed(2)}</td>
                                        <td>{txn.category || 'N/A'}</td>
                                        <td>{txn.account ? `${txn.account.accountNumber} (${txn.account.accountType})` : 'N/A'}</td>
                                        <td>{txn.recipient ? `${txn.recipient.fullName} (${txn.recipient.email.substring(0,5)}...)` : 'N/A'}</td>
                                        <td>{new Date(txn.createdAt).toLocaleDateString()}</td>
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

export default AdminDashboard;