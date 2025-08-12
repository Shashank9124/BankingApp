import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Spinner from '../components/Spinner';
import './AuthForm.css';

const Register = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [mobileNumber, setMobileNumber] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { register, user } = useAuth();
    const navigate = useNavigate();

    const [validationErrors, setValidationErrors] = useState({});

    useEffect(() => {
        if (user) {
            navigate('/dashboard');
        }
    }, [user, navigate]);

    const validateField = (name, value) => {
        let isValid = true;
        let errorMessage = '';
        
        switch (name) {
            case 'fullName':
                if (value.trim() === '') {
                    isValid = false;
                    errorMessage = 'Full name is required.';
                }
                break;
            case 'email':
                const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
                if (!emailRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Please provide a valid email.';
                }
                break;
            case 'mobileNumber':
                const mobileRegex = /^\d{10}$/;
                if (!mobileRegex.test(value)) {
                    isValid = false;
                    errorMessage = 'Mobile number must be 10 digits.';
                }
                break;
            case 'password':
                if (value.length < 6) {
                    isValid = false;
                    errorMessage = 'Password must be at least 6 characters long.';
                }
                break;
            default:
                break;
        }

        setValidationErrors(prev => ({
            ...prev,
            [name]: isValid ? '' : errorMessage,
        }));
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === 'fullName') setFullName(value);
        if (name === 'email') setEmail(value);
        if (name === 'mobileNumber') setMobileNumber(value);
        if (name === 'password') setPassword(value);
        
        validateField(name, value);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        const hasErrors = Object.values(validationErrors).some(err => err !== '');
        if (hasErrors) {
            setIsLoading(false);
            return;
        }

        try {
            const result = await register(fullName, email, mobileNumber, password, "Zero Balance");
            if (!result.success) {
                setError(result.message);
            }
        } catch (backendError) {
            setError('An unexpected error occurred. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <h2>Register</h2>
                {error && <div className="alert alert-danger">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="fullName">Full Name</label>
                        <input
                            type="text"
                            id="fullName"
                            name="fullName"
                            value={fullName}
                            onChange={handleChange}
                            required
                        />
                        {validationErrors.fullName && <div className="validation-error">{validationErrors.fullName}</div>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={email}
                            onChange={handleChange}
                            required
                        />
                        {validationErrors.email && <div className="validation-error">{validationErrors.email}</div>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="mobileNumber">Mobile Number</label>
                        <input
                            type="text"
                            id="mobileNumber"
                            name="mobileNumber"
                            value={mobileNumber}
                            onChange={handleChange}
                            required
                        />
                        {validationErrors.mobileNumber && <div className="validation-error">{validationErrors.mobileNumber}</div>}
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={handleChange}
                            required
                        />
                        {validationErrors.password && <div className="validation-error">{validationErrors.password}</div>}
                    </div>
                    <button type="submit" className="btn" disabled={isLoading}>
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                </form>
                <p className="auth-switch-link">
                    Already have an account? <Link to="/login">Login here</Link>
                </p>
                <p className="forgot-password-link">
                    <Link to="/forgot-password">Forgot Password?</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;