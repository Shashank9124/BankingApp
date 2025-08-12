import React, { useState, useEffect, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './SpendingAnalytics.css';
import './AuthForm.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#33FFB2', '#FF5733', '#335EFF'];

const SpendingAnalytics = () => {
    const [spendingData, setSpendingData] = useState([]);
    const [budgets, setBudgets] = useState({});
    const [isEditingBudgets, setIsEditingBudgets] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().substring(0, 10);
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().substring(0, 10);
    const [startDate, setStartDate] = useState(firstDayOfMonth);
    const [endDate, setEndDate] = useState(lastDayOfMonth);

    const fetchAnalyticsData = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const spendingRes = await API.get(`/analytics/spending?startDate=${startDate}&endDate=${endDate}`);
            const budgetsRes = await API.get('/analytics/budgets');

            setSpendingData(spendingRes.data);
            setBudgets(budgetsRes.data);
            setError('');

        } catch (err) {
            console.error('Failed to fetch analytics data:', err);
            setError(err.response?.data?.message || 'Failed to load analytics data.');
        } finally {
            setLoading(false);
        }
    }, [user, startDate, endDate]);

    useEffect(() => {
        fetchAnalyticsData();
    }, [fetchAnalyticsData]);

    const handleBudgetChange = (category, value) => {
        setBudgets(prevBudgets => ({
            ...prevBudgets,
            [category]: value === '' ? null : parseFloat(value),
        }));
    };

    const handleSaveBudgets = async () => {
        setLoading(true);
        try {
            await API.put('/analytics/budgets', budgets);
            setIsEditingBudgets(false);
            fetchAnalyticsData();
        } catch (err) {
            console.error('Failed to save budgets:', err);
            setError(err.response?.data?.message || 'Failed to save budgets.');
        } finally {
            setLoading(false);
        }
    };

    const totalSpending = spendingData.reduce((sum, entry) => sum + entry.totalSpending, 0);

    const allCategories = [...new Set([...spendingData.map(d => d.category), ...Object.keys(budgets)])];
    const combinedData = allCategories.map(category => {
        const spendingEntry = spendingData.find(d => d.category === category) || { totalSpending: 0 };
        const budgetAmount = budgets[category] || 0;
        return {
            category,
            totalSpending: spendingEntry.totalSpending,
            budget: budgetAmount,
        };
    });
    
    if (loading) {
        return <Spinner />;
    }

    if (error) {
        return <div className="alert alert-danger">{error}</div>;
    }
    
    return (
        <div className="analytics-container">
            <h2>Spending & Budget Analytics</h2>

            <div className="date-filter-card card">
                <h3>Filter by Date Range</h3>
                <div className="date-filter-form">
                    <div className="form-group">
                        <label htmlFor="startDate">From:</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="endDate">To:</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {spendingData.length === 0 && Object.keys(budgets).length === 0 ? (
                <p className="no-data-message">No spending or budget data available for this period.</p>
            ) : (
                <div className="analytics-content">
                    <div className="chart-section">
                        <h3>Spending vs. Budget</h3>
                        <div className="budget-chart-wrapper">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={combinedData}
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="category" />
                                    <YAxis />
                                    <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} />
                                    <Legend />
                                    <Bar dataKey="totalSpending" fill="#DC3545" name="Total Spent" />
                                    <Bar dataKey="budget" fill="#00C49F" name="Budget" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="total-spending">
                            <strong>Total Spending:</strong> ₹{totalSpending.toFixed(2)}
                        </div>
                    </div>
                    
                    <div className="table-section">
                        <h3>Set & Manage Budgets</h3>
                        <div className="budget-management">
                            {!isEditingBudgets ? (
                                <>
                                    <table className="spending-table">
                                        <thead>
                                            <tr>
                                                <th>Category</th>
                                                <th>Budget</th>
                                                <th>Spent</th>
                                                <th>Remaining</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {combinedData.map((entry, index) => (
                                                <tr key={index}>
                                                    <td>{entry.category}</td>
                                                    <td>₹{entry.budget ? entry.budget.toFixed(2) : 'N/A'}</td>
                                                    <td>₹{entry.totalSpending.toFixed(2)}</td>
                                                    <td className={entry.totalSpending > entry.budget ? 'over-budget' : 'under-budget'}>
                                                        ₹{(entry.budget - entry.totalSpending).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button onClick={() => setIsEditingBudgets(true)} className="btn primary-btn mt-3">Edit Budgets</button>
                                </>
                            ) : (
                                <>
                                    <p className="edit-budgets-intro">Set a monthly budget for each category.</p>
                                    <table className="spending-table edit-table">
                                        <thead>
                                            <tr>
                                                <th>Category</th>
                                                <th>Monthly Budget (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {allCategories.map((category, index) => (
                                                <tr key={index}>
                                                    <td>{category}</td>
                                                    <td>
                                                        <input
                                                            type="number"
                                                            value={budgets[category] || ''}
                                                            onChange={(e) => handleBudgetChange(category, e.target.value)}
                                                            placeholder="0"
                                                            min="0"
                                                            step="1"
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <button onClick={handleSaveBudgets} className="btn primary-btn mt-3" disabled={loading}>
                                        {loading ? 'Saving...' : 'Save Budgets'}
                                    </button>
                                    <button onClick={() => setIsEditingBudgets(false)} className="btn btn-danger mt-3 ml-2">Cancel</button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpendingAnalytics;