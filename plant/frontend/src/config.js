// API configuration for the plant eCommerce platform
// During development, XAMPP uses http://localhost/plant/backend/api
// For production Hostinger deployment, update this to: https://yourdomain.com/backend/api

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/plant/backend/api';
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_w3hP8z2jN1245A';

