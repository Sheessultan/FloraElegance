// API configuration for the plant eCommerce platform
// Local dev (.env):              http://localhost/plant/backend/api
// Split deploy (.env.production): https://api.floraelegance.codewavestudio.space/api

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost/plant/backend/api';
export const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_w3hP8z2jN1245A';

