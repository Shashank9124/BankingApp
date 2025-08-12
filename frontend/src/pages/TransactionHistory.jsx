import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './TransactionHistory.css';
import './AuthForm.css';

const TransactionHistory = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [statementMonth, setStatementMonth] = useState('');
    const [statementYear, setStatementYear] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [statementMessage, setStatementMessage] = useState('');
    const [statementError, setStatementError] = useState(false);
    const { accounts } = useAuth();
    const [selectedAccount, setSelectedAccount] = useState('');

    // Definitions for months and years dropdowns
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    const months = [
        { name: 'January', value: 1 }, { name: 'February', value: 2 },
        { name: 'March', value: 3 }, { name: 'April', value: 4 },
        { name: 'May', value: 5 }, { name: 'June', value: 6 },
        { name: 'July', value: 7 }, { name: 'August', value: 8 },
        { name: 'September', value: 9 }, { name: 'October', value: 10 },
        { name: 'November', value: 11 }, { name: 'December', value: 12 },
    ];

    useEffect(() => {
        const fetchHistory = async () => {
            let apiUrl = '/transactions/history';
            if (selectedAccount) {
                apiUrl += `?accountNumber=${selectedAccount}`;
            }

            try {
                const res = await API.get(apiUrl);
                setTransactions(res.data);
            } catch (err) {
                console.error('Failed to fetch transaction history:', err);
                setError('Failed to load transaction history. Please try again.');
            } finally {
                setLoading(false);
            }
        };
        fetchHistory();
    }, [selectedAccount]);

    const handleGenerateStatement = async (e) => {
        e.preventDefault();
        setStatementMessage('');
        setStatementError(false);
        setIsGenerating(true);

        if (!statementMonth || !statementYear) {
            setStatementError(true);
            setStatementMessage('Please select both a month and a year.');
            setIsGenerating(false);
            return;
        }
        
        if (!selectedAccount) {
            setStatementError(true);
            setStatementMessage('Please select an account.');
            setIsGenerating(false);
            return;
        }

        try {
            const res = await API.post('/pdf/statement', {
                month: parseInt(statementMonth),
                year: parseInt(statementYear),
                accountNumber: selectedAccount,
            });
            setStatementMessage(res.data.message);
        } catch (err) {
            console.error('Error generating statement:', err.response?.data?.message || err.message);
            setStatementError(true);
            setStatementMessage(err.response?.data?.message || 'Failed to generate statement. Please try again.');
        } finally {
            setIsGenerating(false);
        }
    };

    if (loading) {
        return <Spinner />;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }

    return (
        <div className="history-container">
            <h2>Transaction History</h2>
            {transactions.length === 0 ? (
                <p className="no-transactions">No transactions recorded yet.</p>
            ) : (
                <>
                    <div className="statement-generator card">
                        <h3>Generate Monthly Statement</h3>
                        {statementMessage && (
                            <div className={`alert ${statementError ? 'alert-danger' : 'alert-success'}`}>
                                {statementMessage}
                            </div>
                        )}
                        <form onSubmit={handleGenerateStatement} className="statement-form">
                            <div className="form-group">
                                <label htmlFor="account-select-statement">Select Account</label>
                                <select
                                    id="account-select-statement"
                                    value={selectedAccount}
                                    onChange={(e) => setSelectedAccount(e.target.value)}
                                    required
                                    disabled={isGenerating}
                                >
                                    <option value="">All Accounts</option>
                                    {accounts.map(acc => (
                                        <option key={acc._id} value={acc.accountNumber}>
                                            {acc.accountType} (No: {acc.accountNumber})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="month-select">Month</label>
                                <select
                                    id="month-select"
                                    value={statementMonth}
                                    onChange={(e) => setStatementMonth(e.target.value)}
                                    required
                                    disabled={isGenerating}
                                >
                                    <option value="">Select Month</option>
                                    {months.map((m) => (
                                        <option key={m.value} value={m.value}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label htmlFor="year-select">Year</label>
                                <select
                                    id="year-select"
                                    value={statementYear}
                                    onChange={(e) => setStatementYear(e.target.value)}
                                    required
                                    disabled={isGenerating}
                                >
                                    <option value="">Select Year</option>
                                    {years.map((y) => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className="btn btn-primary" disabled={isGenerating}>
                                {isGenerating ? 'Generating...' : 'Generate & Email Statement'}
                            </button>
                        </form>
                    </div>

                    <ul className="history-list">
                        {transactions.map((txn) => (
                            <li key={txn._id} className={`history-item transaction-${txn.type}`}>
                                <div className="history-details">
                                    <span className="history-type">{txn.type.charAt(0).toUpperCase() + txn.type.slice(1)}</span>
                                    <span className="transaction-description">
                                        {txn.description}
                                        {txn.category && <span className="transaction-category"> ({txn.category})</span>}
                                    </span>
                                </div>
                                <div className="history-amount-date">
                                    <span className="transaction-amount">₹{txn.amount.toFixed(2)}</span>
                                    <span className="transaction-date">{new Date(txn.createdAt).toLocaleString()}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
};

export default TransactionHistory;