import React, { useState, useEffect } from 'react';
import API from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';

const CategorySelector = ({ onSelect, selectedCategory, disabled }) => {
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        const fetchCategories = async () => {
            if (!user) return;
            try {
                const res = await API.get('/transactions/categories');
                setCategories(res.data);
            } catch (err) {
                console.error('Error fetching categories:', err);
                setError('Failed to load categories.');
            }
        };
        fetchCategories();
    }, [user]);

    const handleAddCategory = async (e) => {
        e.preventDefault();
        if (!newCategory || newCategory.trim() === '') {
            setError('Category name cannot be empty.');
            return;
        }

        try {
            const res = await API.post('/transactions/categories', { newCategory });
            setCategories(res.data.categories);
            setNewCategory('');
            setError('');
            setIsAdding(false);
            onSelect(newCategory); 
        } catch (err) {
            console.error('Error adding category:', err);
            setError(err.response?.data?.message || 'Failed to add category.');
        }
    };

    return (
        <div className="form-group category-selector">
            <label htmlFor="category-select">Select a Category</label>
            <select
                id="category-select"
                className="category-dropdown"
                value={selectedCategory}
                onChange={(e) => onSelect(e.target.value)}
                required
                disabled={disabled}
            >
                <option value="" disabled>Choose a category</option>
                {categories.map((cat, index) => (
                    <option key={index} value={cat}>{cat}</option>
                ))}
            </select>
            {error && <small className="validation-error">{error}</small>}

            <div className="add-category-section">
                {!isAdding ? (
                    <button type="button" onClick={() => setIsAdding(true)} className="btn btn-secondary btn-sm">
                        + Add New Category
                    </button>
                ) : (
                    <div className="add-category-form">
                        <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="e.g., 'Groceries'"
                        />
                        <button type="button" onClick={handleAddCategory} className="btn btn-primary btn-sm">Add</button>
                        <button type="button" onClick={() => setIsAdding(false)} className="btn btn-danger btn-sm">Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default CategorySelector;