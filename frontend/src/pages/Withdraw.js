import React, { useState } from 'react';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import CategorySelector from '../components/CategorySelector';
import Spinner from '../components/Spinner'; // Import Spinner
import './TransactionForms.css';

const Withdraw = () => {
    const [amount, setAmount] = useState('');
    const [transactionPin, setTransactionPin] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [category, setCategory] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { setUser, hasTransactionPin, accounts } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setIsLoading(true);

        if (amount <= 0) {
            setError('Amount must be positive');
            setIsLoading(false);
            return;
        }

        if (!hasTransactionPin) {
            setError('Please set your transaction PIN before making a withdrawal.');
            setIsLoading(false);
            return;
        }
        
        if (!selectedAccount) {
            setError('Please select an account.');
            setIsLoading(false);
            return;
        }

        if (!category) {
            setError('Please select a transaction category.');
            setIsLoading(false);
            return;
        }

        if (!/^\d{4}$/.test(transactionPin) && !/^\d{6}$/.test(transactionPin)) {
            setError('Transaction PIN must be 4 or 6 digits long.');
            setIsLoading(false);
            return;
        }

        try {
            const res = await API.post('/transactions/withdraw', { amount: parseFloat(amount), transactionPin, category, accountNumber: selectedAccount });
            setMessage(res.data.message);
            setError('');
            const updatedAccounts = accounts.map(acc => acc.accountNumber === selectedAccount ? { ...acc, balance: res.data.newBalance } : acc);
            setUser(prevUser => ({
                ...prevUser,
                accounts: updatedAccounts
            }));
            setAmount('');
            setTransactionPin('');
            setCategory('');
        } catch (err) {
            console.error('Withdrawal error:', err.response?.data?.message || err.message);
            setError(err.response?.data?.message || 'Withdrawal failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="transaction-container">
            <div className="transaction-card">
                <h2>Withdraw Funds</h2>
                {message && <div className="alert alert-success">{message}</div>}
                {error && <div className="alert alert-danger">{error}</div>}

                {!hasTransactionPin && (
                    <div className="alert alert-warning">
                        You need to <Link to="/set-transaction-pin">set your Transaction PIN</Link> before making withdrawals.
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="account-select">Select Account</label>
                        <select
                            id="account-select"
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            required
                            disabled={isLoading || !hasTransactionPin}
                        >
                            <option value="">Choose an account...</option>
                            {accounts.map(acc => (
                                <option key={acc._id} value={acc.accountNumber}>
                                    {acc.accountType} (No: {acc.accountNumber}, Bal: ₹{acc.balance.toFixed(2)})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="amount">Amount</label>
                        <input
                            type="number"
                            id="amount"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            min="0.01"
                            step="0.01"
                            required
                            disabled={isLoading || !hasTransactionPin}
                        />
                    </div>
                    <CategorySelector
                        onSelect={setCategory}
                        selectedCategory={category}
                        disabled={isLoading || !hasTransactionPin}
                    />
                    <div className="form-group">
                        <label htmlFor="transactionPin">Transaction PIN</label>
                        <input
                            type="password"
                            id="transactionPin"
                            value={transactionPin}
                            onChange={(e) => setTransactionPin(e.target.value)}
                            maxLength="6"
                            required
                            disabled={isLoading || !hasTransactionPin}
                        />
                    </div>
                    <button type="submit" className="btn btn-danger" disabled={isLoading || !hasTransactionPin}>
                        {isLoading ? 'Processing...' : 'Withdraw'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Withdraw;