import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc } from "firebase/firestore";
import { auth, db } from '../../../firebase';
import './LoginPopup.css';

const LoginPopup = ({ onClose }) => {
    const [isSignup, setIsSignup] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        lastName: ''
    });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            if (isSignup) {
                // Validation checks for signup
                if (formData.password !== formData.confirmPassword) {
                    setError("Passwords don't match");
                    setIsLoading(false);
                    return;
                }

                if (formData.password.length < 6) {
                    setError('Password should be at least 6 characters');
                    setIsLoading(false);
                    return;
                }

                // Create user and save additional data to Firestore
                const userCredential = await createUserWithEmailAndPassword(
                    auth,
                    formData.email,
                    formData.password
                );
                const user = userCredential.user;

                await setDoc(doc(db, "Users", user.uid), {
                    email: user.email,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    photo: ""
                });
            } else {
                await signInWithEmailAndPassword(
                    auth,
                    formData.email,
                    formData.password
                );
                console.log("User logged in successfully");
            }

            onClose();
        } catch (error) {
            console.error("Authentication error:", error);

            // Comprehensive error handling
            const errorCode = error.code;
            const errorMessages = {
                'auth/email-already-in-use': 'This email is already registered',
                'auth/invalid-email': 'Please enter a valid email address',
                'auth/operation-not-allowed': 'Email/password accounts are not enabled. Please contact support.',
                'auth/weak-password': 'Password should be at least 6 characters',
                'auth/user-disabled': 'This account has been disabled',
                'auth/user-not-found': 'No account found with this email',
                'auth/wrong-password': 'Incorrect password',
                'auth/network-request-failed': 'Network error. Please check your connection.',
                'auth/too-many-requests': 'Too many attempts. Please try again later.',
                'auth/internal-error': 'An internal error occurred. Please try again.'
            };

            setError(errorMessages[errorCode] || 'An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    return (
        <div className="login-popup-overlay" onClick={onClose}>
            <div className="login-popup" onClick={(e) => e.stopPropagation()}>
                <h2>
                    {isSignup ? 'Create Account' : 'Log In to Zest'}
                    <button className="close-btn" onClick={onClose}>×</button>
                </h2>

                <form onSubmit={handleSubmit}>
                    {error && <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}

                    {isSignup && (
                        <>
                            <input
                                type="text"
                                name="firstName"
                                placeholder="First Name"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                                disabled={isLoading}
                            />
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Last Name"
                                value={formData.lastName}
                                onChange={handleChange}
                                disabled={isLoading}
                            />
                        </>
                    )}

                    <input
                        type="email"
                        name="email"
                        placeholder="Email"
                        value={formData.email}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />

                    <input
                        type="password"
                        name="password"
                        placeholder="Password"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={isLoading}
                    />

                    {isSignup && (
                        <input
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm Password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            disabled={isLoading}
                        />
                    )}

                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Please wait...' : (isSignup ? 'Sign Up' : 'Log In')}
                    </button>

                    <button
                        type="button"
                        className="toggle-form"
                        onClick={() => {
                            if (!isLoading) {
                                setIsSignup(!isSignup);
                                setError('');
                                setFormData({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });
                            }
                        }}
                        disabled={isLoading}
                    >
                        {isSignup
                            ? 'Already have an account? Log in'
                            : "Don't have an account? Sign up"}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default LoginPopup;
