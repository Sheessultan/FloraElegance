import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ShieldAlert, Leaf, Layers, ShoppingBag, DollarSign, Plus, Edit2, 
  Trash2, RefreshCw, X, Check, ArrowRight, ShieldCheck, ChevronDown, ChevronUp,
  Eye, Calendar, CheckCircle, Star, EyeOff, Filter, PhoneCall, Download, DownloadCloud,
  Search, Truck, MapPin, CreditCard, Banknote, Package, CheckSquare, Square
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { generateInvoice } from '../utils/invoiceGenerator';
import {
  formatOrderNumber,
  filterOrders,
  getOrderSmartTags,
  buildCustomerOrderCounts,
  exportOrdersToCsv,
  DEFAULT_ORDER_FILTERS,
  ORDER_STATUS_OPTIONS,
  DATE_RANGE_OPTIONS,
  PAYMENT_FILTER_OPTIONS,
  getPaymentMethod,
} from '../utils/orderHelpers';
import { defaultContentSection, parseContentSections } from '../utils/commerceHelpers';
import AdminCustomersTab from '../components/admin/AdminCustomersTab';
import AdminCouponsTab from '../components/admin/AdminCouponsTab';
import AdminInventoryTab from '../components/admin/AdminInventoryTab';
import AdminThemeToggle from '../components/admin/AdminThemeToggle';
import '../styles/admin-dark.css';

const ADMIN_TABS = [
  { id: 'stats', label: 'Dashboard' },
  { id: 'orders', label: 'Orders' },
  { id: 'products', label: 'Products' },
  { id: 'categories', label: 'Categories' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'customers', label: 'Customers' },
  { id: 'coupons', label: 'Coupons' },
  { id: 'inquiries', label: 'Inquiries' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'mega_menu', label: 'Mega Menu' },
  { id: 'settings', label: 'Settings' },
];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('stats');
  const [darkMode, setDarkMode] = useState(() => {
    try {
      return localStorage.getItem('admin_dark_mode') === '1';
    } catch {
      return false;
    }
  });

  // API Lists
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [megaMenuLinks, setMegaMenuLinks] = useState([]);
  const [inquiries, setInquiries] = useState([]);
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [allReviews, setAllReviews] = useState([]);
  const [notificationPermission, setNotificationPermission] = useState(typeof Notification !== 'undefined' ? Notification.permission : 'default');
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Modal Control States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [megaMenuModalOpen, setMegaMenuModalOpen] = useState(false);
  const [customGroupOpen, setCustomGroupOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null); // null for "Add", object for "Edit"
  const [selectedCategory, setSelectedCategory] = useState(null); // null for "Add", object for "Edit"
  const [activeOrderDetails, setActiveOrderDetails] = useState(null);
  const [orderFilters, setOrderFilters] = useState(DEFAULT_ORDER_FILTERS);
  const [showOrderFilters, setShowOrderFilters] = useState(true);
  const [selectedOrderIds, setSelectedOrderIds] = useState([]);
  const [trackingForm, setTrackingForm] = useState({ tracking_number: '', tracking_carrier: '', tracking_status: '' });

  // Mega Menu Form State
  const [megaMenuForm, setMegaMenuForm] = useState({
    title: '',
    url: '/shop',
    category_group: 'Shop by Category'
  });
  const [selectedMegaLink, setSelectedMegaLink] = useState(null);

  // Product Form Input State
  const [uploadingImage, setUploadingImage] = useState(false);

  const [productForm, setProductForm] = useState({
    name: '',
    category_id: '',
    price: '',
    selling_price: '',
    stock: '',
    image_url: '',
    size: 'Medium',
    care_level: 'Easy',
    description: '',
    show_on_home: 0,
    height_cm: '',
    pot_size: '',
    visual_scale: 'Desktop Scale',
    care_guide: '',
    delivery_info: '',
    perfect_for: 'Office Desk, Gifting, Home Decor',
    sun_exposure: '',
    hydration: '',
    toxin_filtration: ''
  });

  // Category Form Input State
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
    image_url: '',
    show_on_home: 0
  });

  // Website siteSettings State
  const [siteSettings, setSiteSettings] = useState({
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    contact_working_hours: '',
    hero_images: ''
  });

  const handleImageUpload = async (e, formType) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadingImage(true);
      const res = await axios.post(`${API_BASE_URL}/upload.php`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        if (formType === 'product') {
          setProductForm(prev => ({ ...prev, image_url: res.data.url }));
        } else if (formType === 'category') {
          setCategoryForm(prev => ({ ...prev, image_url: res.data.url }));
        } else if (formType === 'hero_image_add') {
          const newHero = res.data.url;
          const currentHeros = siteSettings.hero_images ? siteSettings.hero_images.split(',').filter(x => x.trim() !== '') : [];
          setSiteSettings(prev => ({ ...prev, hero_images: [...currentHeros, newHero].join(',') }));
        }
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload image. Max size is 5MB.');
    } finally {
      setUploadingImage(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('admin_dark_mode', darkMode ? '1' : '0');
    } catch { /* ignore */ }
    document.documentElement.classList.toggle('admin-theme-dark', darkMode);
  }, [darkMode]);

  // Initial load
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch Products
      const prodRes = await axios.get(`${API_BASE_URL}/products.php?admin=1`);
      if (prodRes.data.success) setProducts(prodRes.data.data);

      // 2. Fetch Categories
      const catRes = await axios.get(`${API_BASE_URL}/categories.php`);
      if (catRes.data.success) setCategories(catRes.data.data);

      // 3. Fetch Orders
      const orderRes = await axios.get(`${API_BASE_URL}/orders.php`);
      if (orderRes.data.success) setOrders(orderRes.data.data);

      // 4. Fetch Mega Menu Links
      const megaRes = await axios.get(`${API_BASE_URL}/mega_menu.php`);
      if (megaRes.data.success) setMegaMenuLinks(megaRes.data.data);

      // 5. Fetch Settings
      try {
        const settingsRes = await axios.get(`${API_BASE_URL}/settings.php`);
        if (settingsRes.data.success) {
          setSiteSettings(settingsRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load settings:', err);
      }

      // 6. Fetch Inquiries
      try {
        const inquiriesRes = await axios.get(`${API_BASE_URL}/inquiries.php`);
        if (inquiriesRes.data.success) {
          setInquiries(inquiriesRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load inquiries:', err);
      }

      // 7. Fetch Reviews for admin
      try {
        const reviewsRes = await axios.get(`${API_BASE_URL}/reviews.php?admin=1`);
        if (reviewsRes.data.success) {
          setAllReviews(reviewsRes.data.data);
        }
      } catch (err) {
        console.error('Failed to load reviews:', err);
      }

    } catch (err) {
      setError('Failed to fetch administrative catalogs. Verify your token or local database connection.');
    } finally {
      setLoading(false);
    }
  };

  const customerOrderCounts = useMemo(() => buildCustomerOrderCounts(orders), [orders]);
  const filteredOrders = useMemo(() => filterOrders(orders, orderFilters), [orders, orderFilters]);

  const handleAlertTimeout = () => {
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 4000);
  };

  // ================= PRODUCTS CRUD HANDLERS =================
  const openProductAddModal = () => {
    setSelectedProduct(null);
    setProductForm({
      name: '',
      category_id: categories[0]?.id || '',
      price: '',
      selling_price: '',
      stock: '',
      image_url: '',
      size: 'Medium',
      care_level: 'Easy',
      description: '',
      show_on_home: 0,
      rating: '4.5',
      gallery_images: '',
      biological_specs: '',
      height_cm: '',
      pot_size: '',
      visual_scale: 'Desktop Scale',
      care_guide: '',
      delivery_info: '',
      perfect_for: 'Office Desk, Gifting, Home Decor',
      sun_exposure: '',
      hydration: '',
      toxin_filtration: '',
      is_active: 1,
      content_sections: '[]',
    });
    setProductModalOpen(true);
  };

  const openProductEditModal = (product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name,
      category_id: product.category_id,
      price: product.price,
      selling_price: product.selling_price || '',
      stock: product.stock,
      image_url: product.image_url,
      size: product.size,
      care_level: product.care_level,
      description: product.description,
      show_on_home: product.show_on_home || 0,
      rating: product.rating || '4.5',
      gallery_images: product.gallery_images || '',
      biological_specs: product.biological_specs || '',
      height_cm: product.height_cm || '',
      pot_size: product.pot_size || '',
      visual_scale: product.visual_scale || 'Desktop Scale',
      care_guide: product.care_guide || '',
      delivery_info: product.delivery_info || '',
      perfect_for: product.perfect_for || 'Office Desk, Gifting, Home Decor',
      sun_exposure: product.sun_exposure || '',
      hydration: product.hydration || '',
      toxin_filtration: product.toxin_filtration || '',
      is_active: product.is_active !== undefined ? parseInt(product.is_active, 10) : 1,
      content_sections: product.content_sections || '[]',
    });
    setProductModalOpen(true);
  };

  const getContentSections = () => parseContentSections(productForm.content_sections);

  const updateContentSection = (index, field, value) => {
    const sections = [...getContentSections()];
    if (!sections[index]) return;
    sections[index] = { ...sections[index], [field]: value };
    setProductForm((prev) => ({ ...prev, content_sections: JSON.stringify(sections) }));
  };

  const addContentSection = () => {
    const sections = [...getContentSections(), { ...defaultContentSection(), sort_order: getContentSections().length }];
    setProductForm((prev) => ({ ...prev, content_sections: JSON.stringify(sections) }));
  };

  const removeContentSection = (index) => {
    const sections = getContentSections().filter((_, i) => i !== index);
    setProductForm((prev) => ({ ...prev, content_sections: JSON.stringify(sections) }));
  };

  const adminNotify = (message, type = 'success') => {
    if (type === 'error') setError(message);
    else setSuccess(message);
    handleAlertTimeout();
  };

  // Biological specifications row helpers
  const updateSpecRow = (index, field, value) => {
    let currentSpecs = [];
    try {
      currentSpecs = JSON.parse(productForm.biological_specs || '[]');
    } catch(e) {}
    if (!Array.isArray(currentSpecs)) currentSpecs = [];
    
    if (!currentSpecs[index]) {
      currentSpecs[index] = { label: '', value: '' };
    }
    currentSpecs[index][field] = value;
    setProductForm(prev => ({ ...prev, biological_specs: JSON.stringify(currentSpecs) }));
  };

  const addSpecRow = () => {
    let currentSpecs = [];
    try {
      currentSpecs = JSON.parse(productForm.biological_specs || '[]');
    } catch(e) {}
    if (!Array.isArray(currentSpecs)) currentSpecs = [];
    
    currentSpecs.push({ label: '', value: '' });
    setProductForm(prev => ({ ...prev, biological_specs: JSON.stringify(currentSpecs) }));
  };

  const removeSpecRow = (index) => {
    let currentSpecs = [];
    try {
      currentSpecs = JSON.parse(productForm.biological_specs || '[]');
    } catch(e) {}
    if (!Array.isArray(currentSpecs)) currentSpecs = [];
    
    currentSpecs.splice(index, 1);
    setProductForm(prev => ({ ...prev, biological_specs: JSON.stringify(currentSpecs) }));
  };

  // Review management actions
  const handleReviewStatusToggle = async (reviewId, currentStatus) => {
    setActionLoading(true);
    try {
      const newStatus = currentStatus === 'approved' ? 'hidden' : 'approved';
      const res = await axios.put(`${API_BASE_URL}/reviews.php?id=${reviewId}`, { status: newStatus });
      if (res.data.success) {
        setSuccess(`Review marked as ${newStatus}.`);
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Error updating review status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewDelete = async (reviewId) => {
    if (!window.confirm('Are you sure you want to permanently delete this review?')) return;
    setActionLoading(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/reviews.php?id=${reviewId}`);
      if (res.data.success) {
        setSuccess('Review permanently deleted.');
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Error deleting review.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProductSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (selectedProduct) {
        // Edit product PUT
        const res = await axios.put(`${API_BASE_URL}/products.php?id=${selectedProduct.id}`, productForm);
        if (res.data.success) {
          setSuccess('Product successfully modified.');
          setProductModalOpen(false);
          fetchAllData();
        }
      } else {
        // Add product POST
        const res = await axios.post(`${API_BASE_URL}/products.php`, productForm);
        if (res.data.success) {
          setSuccess('Product successfully added to catalog.');
          setProductModalOpen(false);
          fetchAllData();
        }
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Error processing product mutation.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleProductDelete = async (productId) => {
    if (!window.confirm('Are you sure you want to permanently delete this product?')) return;
    setActionLoading(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/products.php?id=${productId}`);
      if (res.data.success) {
        setSuccess('Product removed from catalog.');
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete product.');
    } finally {
      setActionLoading(false);
    }
  };

  // ================= CATEGORIES CRUD HANDLERS =================
  const openCategoryAddModal = () => {
    setSelectedCategory(null);
    setCategoryForm({ name: '', description: '', image_url: '', show_on_home: 0 });
    setCategoryModalOpen(true);
  };

  const openCategoryEditModal = (cat) => {
    setSelectedCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description, image_url: cat.image_url, show_on_home: cat.show_on_home || 0 });
    setCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      if (selectedCategory) {
        // Edit category PUT
        const res = await axios.put(`${API_BASE_URL}/categories.php?id=${selectedCategory.id}`, categoryForm);
        if (res.data.success) {
          setSuccess('Category details modified.');
          setCategoryModalOpen(false);
          fetchAllData();
        }
      } else {
        // Add category POST
        const res = await axios.post(`${API_BASE_URL}/categories.php`, categoryForm);
        if (res.data.success) {
          setSuccess('Category successfully created.');
          setCategoryModalOpen(false);
          fetchAllData();
        }
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to modify category.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCategoryDelete = async (catId) => {
    if (!window.confirm('Warning: Deleting a category will cascade delete all products associated with it. Continue?')) return;
    setActionLoading(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/categories.php?id=${catId}`);
      if (res.data.success) {
        setSuccess('Category successfully deleted.');
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setActionLoading(false);
    }
  };

  // ================= ORDERS LOGISTICS UPDATE =================
  const handleUpdateOrderStatus = async (orderId, status) => {
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/orders.php?action=update_status`, {
        order_id: orderId,
        status: status
      });
      if (res.data.success) {
        setSuccess('Order status transitioned to ' + status);
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to transition order status.');
    } finally {
      setActionLoading(false);
    }
  };

  const fetchOrderDetails = async (orderId) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/orders.php?id=${orderId}`);
      if (res.data.success) {
        const data = res.data.data;
        setActiveOrderDetails(data);
        setTrackingForm({
          tracking_number: data.tracking_number || '',
          tracking_carrier: data.tracking_carrier || '',
          tracking_status: data.tracking_status || (data.status === 'shipped' ? 'In transit' : ''),
        });
      }
    } catch (err) {
      setError('Failed to fetch detailed order items.');
    }
  };

  const toggleOrderSelect = (orderId) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const toggleSelectAllFiltered = () => {
    const ids = filteredOrders.map((o) => o.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedOrderIds.includes(id));
    setSelectedOrderIds(allSelected ? selectedOrderIds.filter((id) => !ids.includes(id)) : [...new Set([...selectedOrderIds, ...ids])]);
  };

  const handleBulkOrderStatus = async (status) => {
    if (selectedOrderIds.length === 0) {
      setError('Select at least one order for bulk action.');
      return;
    }
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/orders.php?action=bulk_update`, {
        order_ids: selectedOrderIds,
        status,
      });
      if (res.data.success) {
        setSuccess(res.data.message);
        setSelectedOrderIds([]);
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Bulk update failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveTracking = async () => {
    if (!activeOrderDetails) return;
    setActionLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/orders.php?action=update_tracking`, {
        order_id: activeOrderDetails.id,
        ...trackingForm,
      });
      if (res.data.success) {
        setSuccess('Delivery tracking updated.');
        await fetchOrderDetails(activeOrderDetails.id);
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save tracking.');
    } finally {
      setActionLoading(false);
    }
  };

  const resetOrderFilters = () => {
    setOrderFilters(DEFAULT_ORDER_FILTERS);
    setSelectedOrderIds([]);
  };

  // ================= MEGA MENU LINKS CRUD HANDLERS =================
  const openMegaMenuAddModal = () => {
    setSelectedMegaLink(null);
    const uniqueCategoryGroups = Array.from(new Set(megaMenuLinks.map(link => link.category_group)));
    setMegaMenuForm({
      title: '',
      url: '/shop',
      category_group: uniqueCategoryGroups[0] || 'Shop by Category'
    });
    setCustomGroupOpen(false);
    setMegaMenuModalOpen(true);
  };

  const openMegaMenuEditModal = (link) => {
    setSelectedMegaLink(link);
    setMegaMenuForm({
      title: link.title,
      url: link.url,
      category_group: link.category_group
    });
    setCustomGroupOpen(false);
    setMegaMenuModalOpen(true);
  };

  const handleMegaMenuSubmit = async (e) => {
    e.preventDefault();
    if (!megaMenuForm.title.trim() || !megaMenuForm.url.trim() || !megaMenuForm.category_group.trim()) {
      setError('Please fill in all menu fields.');
      return;
    }
    setActionLoading(true);
    try {
      let res;
      if (selectedMegaLink) {
        res = await axios.put(`${API_BASE_URL}/mega_menu.php?id=${selectedMegaLink.id}`, megaMenuForm);
      } else {
        res = await axios.post(`${API_BASE_URL}/mega_menu.php`, megaMenuForm);
      }
      if (res.data.success) {
        setSuccess(selectedMegaLink ? 'Mega menu link successfully updated.' : 'Mega menu link successfully registered.');
        setMegaMenuModalOpen(false);
        setMegaMenuForm({ title: '', url: '/shop', category_group: 'Shop by Category' });
        setSelectedMegaLink(null);
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save menu link.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMegaMenuDelete = async (linkId) => {
    if (!window.confirm('Are you sure you want to permanently delete this mega menu link?')) return;
    setActionLoading(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/mega_menu.php?id=${linkId}`);
      if (res.data.success) {
        setSuccess('Mega menu link successfully removed.');
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove menu link.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleMegaMenuDeleteCategoryGroup = async (groupName) => {
    if (!window.confirm(`Are you sure you want to permanently delete the entire category column "${groupName}" and all of its associated links?`)) return;
    setActionLoading(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/mega_menu.php?category_group=${encodeURIComponent(groupName)}`);
      if (res.data.success) {
        setSuccess(`Category column "${groupName}" and all its links successfully removed.`);
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove category column.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/settings.php`, siteSettings);
      if (res.data.success) {
        setSuccess('Website coordinates saved successfully.');
        fetchAllData();
      }
      handleAlertTimeout();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save website coordinates.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleInquiryStatus = async (inquiryId, currentStatus) => {
    setActionLoading(true);
    try {
      const nextStatus = currentStatus === 'unread' ? 'read' : 'unread';
      const res = await axios.put(`${API_BASE_URL}/inquiries.php?id=${inquiryId}`, { status: nextStatus });
      if (res.data.success) {
        setSuccess(`Inquiry marked as ${nextStatus}.`);
        // Refresh local data
        const inquiriesRes = await axios.get(`${API_BASE_URL}/inquiries.php`);
        if (inquiriesRes.data.success) {
          setInquiries(inquiriesRes.data.data);
        }
      }
      handleAlertTimeout();
    } catch (err) {
      setError('Failed to update inquiry status.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteInquiry = async (inquiryId) => {
    if (!window.confirm('Are you sure you want to permanently delete this inquiry?')) return;
    setActionLoading(true);
    try {
      const res = await axios.delete(`${API_BASE_URL}/inquiries.php?id=${inquiryId}`);
      if (res.data.success) {
        setSuccess('Inquiry permanently deleted.');
        // Refresh local data
        const inquiriesRes = await axios.get(`${API_BASE_URL}/inquiries.php`);
        if (inquiriesRes.data.success) {
          setInquiries(inquiriesRes.data.data);
        }
      }
      handleAlertTimeout();
    } catch (err) {
      setError('Failed to delete inquiry.');
    } finally {
      setActionLoading(false);
    }
  };

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications.');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
    if (permission === 'granted') {
      new Notification('FloraElegance Alerts Enabled!', {
        body: 'You will receive real-time notifications for new customer inquiries.',
        icon: '/logo.png'
      });
    }
  };

  // Live polling for new inquiries, orders, and reviews in background to fire notifications
  useEffect(() => {
    const fetchDashboardUpdates = async () => {
      if (Notification.permission !== 'granted') return;
      
      // 1. Poll Inquiries
      try {
        const res = await axios.get(`${API_BASE_URL}/inquiries.php`);
        if (res.data.success) {
          const freshInquiries = res.data.data;
          if (inquiries.length > 0) {
            const existingIds = new Set(inquiries.map(item => item.id));
            const newItems = freshInquiries.filter(item => !existingIds.has(item.id) && item.status === 'unread');
            newItems.forEach(item => {
              new Notification('New Inquiry Alert! 🔔', {
                body: `From: ${item.name} - ${item.subject}`,
                tag: `inquiry-${item.id}`
              });
            });
          }
          setInquiries(freshInquiries);
        }
      } catch (err) {}

      // 2. Poll Orders
      try {
        const res = await axios.get(`${API_BASE_URL}/orders.php`);
        if (res.data.success) {
          const freshOrders = res.data.data;
          if (orders.length > 0) {
            const existingIds = new Set(orders.map(item => item.id));
            const newItems = freshOrders.filter(item => !existingIds.has(item.id));
            newItems.forEach(item => {
              new Notification('New Order Placed! 📦', {
                body: `Order #FE-00${item.id} - ${item.customer_name} placed an order of ₹${item.total_amount}`,
                tag: `order-${item.id}`
              });
            });
          }
          setOrders(freshOrders);
        }
      } catch (err) {}

      // 3. Poll Reviews
      try {
        const res = await axios.get(`${API_BASE_URL}/reviews.php?admin=1`);
        if (res.data.success) {
          const freshReviews = res.data.data;
          if (allReviews.length > 0) {
            const existingIds = new Set(allReviews.map(item => item.id));
            const newItems = freshReviews.filter(item => !existingIds.has(item.id));
            newItems.forEach(item => {
              new Notification('New Product Review! ⭐', {
                body: `From ${item.user_name}: "${item.comment.substring(0, 50)}..." (${item.rating} Stars) on ${item.product_name || 'Plant'}`,
                tag: `review-${item.id}`
              });
            });
          }
          setAllReviews(freshReviews);
        }
      } catch (err) {}
    };

    const interval = setInterval(fetchDashboardUpdates, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [inquiries, orders, allReviews]);

  // ================= STATISTICS COMPILATIONS =================
  const totalRevenue = orders
    .filter(order => order.status === 'paid' || order.status === 'shipped' || order.status === 'delivered')
    .reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const completedDeliveries = orders.filter(o => o.status === 'delivered').length;

  const avgRating = products.length > 0 
    ? (products.reduce((sum, p) => sum + parseFloat(p.rating || 0), 0) / products.length).toFixed(1)
    : '0.0';

  const lowStockThreshold = parseInt(siteSettings.low_stock_threshold, 10) || 5;
  const lowStockItems = products.filter(p => parseInt(p.stock, 10) <= lowStockThreshold && parseInt(p.stock, 10) > 0);

  const categoryStats = categories.map(cat => {
    const count = products.filter(p => p.category_id === cat.id).length;
    const totalProducts = products.length || 1;
    const sharePercent = Math.round((count / totalProducts) * 100);
    return {
      ...cat,
      count,
      sharePercent
    };
  }).sort((a, b) => b.count - a.count);

  const getSalesTrend = () => {
    const dailyData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
      dailyData.push({
        date: dateStr,
        fullDate: d.toDateString(),
        amount: 0
      });
    }

    orders.forEach(order => {
      if (order.status === 'failed') return;
      const orderDate = new Date(order.created_at).toDateString();
      const match = dailyData.find(day => day.fullDate === orderDate);
      if (match) {
        match.amount += parseFloat(order.total_amount) || 0;
      }
    });
    return dailyData;
  };

  const getOrderStatusDistribution = () => {
    const counts = { pending: 0, paid: 0, shipped: 0, delivered: 0, failed: 0 };
    orders.forEach(o => {
      const s = o.status || 'pending';
      if (counts[s] !== undefined) counts[s]++;
      else counts['pending']++;
    });

    const total = orders.length || 1;
    const colors = {
      pending: '#f59e0b',
      paid: '#22c55e',
      shipped: '#3b82f6',
      delivered: '#07fa10',
      failed: '#ef4444'
    };

    let accumulatedPercent = 0;
    return Object.keys(counts).map(key => {
      const count = counts[key];
      const percent = (count / total) * 100;
      const startAngle = (accumulatedPercent / 100) * 360;
      accumulatedPercent += percent;
      const endAngle = (accumulatedPercent / 100) * 360;
      return {
        status: key,
        count,
        percent,
        startAngle,
        endAngle,
        color: colors[key]
      };
    }).filter(s => s.count > 0);
  };

  const trendData = getSalesTrend();
  const maxSales = Math.max(...trendData.map(d => d.amount), 1000);

  const chartWidth = 500;
  const chartHeight = 200;
  const paddingLeft = 50;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const points = trendData.map((d, index) => {
    const x = paddingLeft + (index * (plotWidth / (trendData.length - 1)));
    const y = paddingTop + plotHeight - ((d.amount / maxSales) * plotHeight);
    return { x, y, amount: d.amount, date: d.date };
  });

  const getSmoothLinePath = (pts) => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[0];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i !== pts.length - 2 ? pts[i + 2] : p2;
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const linePath = getSmoothLinePath(points);

  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingBottom} L ${points[0].x} ${chartHeight - paddingBottom} Z` 
    : '';

  const donutSegments = getOrderStatusDistribution();

  // 1. Care Level Distribution
  const getCareLevelDistribution = () => {
    const counts = { Easy: 0, Moderate: 0, Expert: 0 };
    products.forEach(p => {
      let level = p.care_level || 'Easy';
      if (level === 'Medium') level = 'Moderate'; // Normalizing Medium to Moderate
      if (counts[level] !== undefined) counts[level]++;
      else counts['Easy']++;
    });

    const total = products.length || 1;
    const colors = { Easy: '#10b981', Moderate: '#f59e0b', Expert: '#ef4444' };
    
    let accumulatedPercent = 0;
    return Object.keys(counts).map(key => {
      const count = counts[key];
      const percent = (count / total) * 100;
      const startAngle = (accumulatedPercent / 100) * 360;
      accumulatedPercent += percent;
      const endAngle = (accumulatedPercent / 100) * 360;
      return {
        level: key,
        count,
        percent,
        startAngle,
        endAngle,
        color: colors[key]
      };
    }).filter(s => s.count > 0);
  };

  const careSegments = getCareLevelDistribution();

  // 2. Pricing Distribution (Vertical Bar Chart)
  const getPricingTiers = () => {
    const tiers = [
      { label: '< ₹500', min: 0, max: 499, count: 0 },
      { label: '₹500-1K', min: 500, max: 999, count: 0 },
      { label: '₹1K-2K', min: 1000, max: 1999, count: 0 },
      { label: '> ₹2K', min: 2000, max: 999999, count: 0 }
    ];

    products.forEach(p => {
      const price = parseFloat(p.selling_price) || parseFloat(p.price) || 0;
      const tier = tiers.find(t => price >= t.min && price <= t.max);
      if (tier) tier.count++;
    });

    const maxCount = Math.max(...tiers.map(t => t.count), 5);
    return { tiers, maxCount };
  };

  const { tiers: priceTiers, maxCount: maxPriceCount } = getPricingTiers();

  const getPieSlice = (cx, cy, r, startAngle, endAngle) => {
    if (endAngle - startAngle >= 359.99) {
      return `M ${cx}, ${cy - r} A ${r},${r} 0 1,1 ${cx},${cy + r} A ${r},${r} 0 1,1 ${cx},${cy - r} Z`;
    }
    const start = (startAngle - 90) * Math.PI / 180;
    const end = (endAngle - 90) * Math.PI / 180;
    const x1 = cx + r * Math.cos(start);
    const y1 = cy + r * Math.sin(start);
    const x2 = cx + r * Math.cos(end);
    const y2 = cy + r * Math.sin(end);
    const largeArcFlag = endAngle - startAngle <= 180 ? 0 : 1;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`;
  };

  const getLabelPos = (cx, cy, r, startAngle, endAngle) => {
    const midAngle = (startAngle + endAngle) / 2;
    const rad = (midAngle - 90) * Math.PI / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad)
    };
  };

  const tabBadge = (id) => {
    if (id === 'orders') return orders.length;
    if (id === 'products') return products.length;
    if (id === 'categories') return categories.length;
    if (id === 'inquiries') return inquiries.filter((i) => i.status === 'unread').length || inquiries.length;
    if (id === 'reviews') return allReviews.length;
    if (id === 'mega_menu') return megaMenuLinks.length;
    return null;
  };

  const themeClass = darkMode ? 'admin-dark' : 'admin-light';

  if (loading) {
    return (
      <div className={`admin-panel ${themeClass} min-h-screen flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className={`admin-panel ${themeClass} min-h-screen text-left`}>
    <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10">
      
      {/* Title Panel */}
      <div className="admin-topbar border-b pb-6 mb-8 flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Secure Admin Control Panel</span>
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-3">FloraElegance Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">Orders · Catalog · Inventory · Customers · Coupons · Site settings</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <AdminThemeToggle darkMode={darkMode} onToggle={() => setDarkMode((d) => !d)} />
          {notificationPermission === 'granted' && (
            <span className="inline-flex items-center space-x-1.5 bg-emerald-50 text-emerald-700 px-3.5 py-2.5 rounded-full text-xs font-extrabold border border-emerald-100 shadow-sm shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>Alerts on</span>
            </span>
          )}
          <Link to="/" className="text-xs font-bold text-slate-500 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 px-3.5 py-2.5 rounded-full border border-slate-200 transition-colors">
            View store
          </Link>
          <button 
            onClick={fetchAllData}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-primary-600 bg-slate-50 hover:bg-primary-50 px-3.5 py-2.5 rounded-full border border-slate-200 hover:border-primary-200 transition-colors shadow-sm cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Sync all</span>
          </button>
        </div>
      </div>

      {/* Browser Notification Permission Required Banner */}
      {notificationPermission !== 'granted' && (
        <div className="bg-gradient-to-r from-primary-600 to-emerald-600 text-white px-6 py-4 rounded-[28px] shadow-lg mb-8 flex flex-col sm:flex-row items-center justify-between gap-4 animate-scale-up">
          <div className="flex items-center space-x-3 text-left">
            <div className="p-2.5 bg-white/20 rounded-2xl shrink-0">
              <svg className="h-6 w-6 text-white animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <h4 className="text-sm font-black uppercase tracking-wider">Browser Notifications Permission Required!</h4>
              <p className="text-xs text-white/80 font-bold mt-0.5">
                Enable desktop alerts to receive real-time audio-visual sound notifications whenever a customer submits an inquiry!
              </p>
            </div>
          </div>
          <button 
            onClick={requestNotificationPermission}
            className="bg-white hover:bg-slate-50 text-primary-700 font-extrabold text-xs px-6 py-3 rounded-full shadow-sm hover:shadow-md cursor-pointer transition-all shrink-0 uppercase tracking-wider"
          >
            🔔 Enable Desktop Notifications
          </button>
        </div>
      )}

      {/* Error / Success Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3.5 rounded-xl text-xs font-semibold mb-6 flex items-center space-x-2 animate-fade-in">
          <ShieldAlert className="h-4.5 w-4.5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3.5 rounded-xl text-xs font-semibold mb-6 flex items-center space-x-2 animate-fade-in">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="admin-tabs-wrap sticky top-0 z-30 -mx-4 sm:-mx-6 lg:-mx-10 px-4 sm:px-6 lg:px-10 py-3 mb-8 border-b backdrop-blur-md">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ADMIN_TABS.map((tab) => {
            const badge = tabBadge(tab.id);
            const unreadInq = tab.id === 'inquiries' && inquiries.filter((i) => i.status === 'unread').length;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative shrink-0 px-4 sm:px-5 py-2.5 rounded-full text-xs font-extrabold transition-all ${
                  activeTab === tab.id ? 'bg-primary-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
                {badge != null && badge > 0 && <span className="ml-1 opacity-80">({badge})</span>}
                {unreadInq > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white border-2 border-white">
                    {unreadInq}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================================== TAB 1: OVERVIEW STATS ================================== */}
      {activeTab === 'stats' && (
        <div className="space-y-8 animate-fade-in text-left">
          
          {/* Dashboard Premium KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sales Revenue */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform opacity-60"></div>
              <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-600 relative z-10 shrink-0">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="text-left relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Sales Revenue</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">&#x20B9;{totalRevenue.toFixed(2)}</h4>
                <p className="text-[10px] text-emerald-600 font-bold mt-0.5">↑ Live Real-time Tracked</p>
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform opacity-60"></div>
              <div className="bg-primary-50 p-4 rounded-2xl text-primary-600 relative z-10 shrink-0">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="text-left relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Orders</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{orders.length}</h4>
                <p className="text-[10px] text-primary-600 font-bold mt-0.5">{pendingOrders} payments pending</p>
              </div>
            </div>

            {/* Total Products */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform opacity-60"></div>
              <div className="bg-slate-50 p-4 rounded-2xl text-slate-600 relative z-10 shrink-0">
                <Leaf className="h-6 w-6" />
              </div>
              <div className="text-left relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Varieties In Catalog</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{products.length}</h4>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">{avgRating} ★ Avg Specimen Rating</p>
              </div>
            </div>

            {/* Total Reviews */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex items-center space-x-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full translate-x-8 -translate-y-8 group-hover:scale-110 transition-transform opacity-60"></div>
              <div className="bg-amber-50 p-4 rounded-2xl text-amber-600 relative z-10 shrink-0">
                <Star className="h-6 w-6" />
              </div>
              <div className="text-left relative z-10">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Customer Reviews</p>
                <h4 className="text-2xl font-black text-slate-900 mt-1">{allReviews.length}</h4>
                <p className="text-[10px] text-amber-600 font-bold mt-0.5">Verified Plant Feedbacks</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Sales & Revenue Trend Chart */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm lg:col-span-8 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-1">Weekly Sales Revenue Trend</h4>
                <p className="text-[11px] text-slate-400 font-semibold mb-4">Total revenue aggregated over the last 7 calendar days.</p>
              </div>
              <div className="relative mt-4">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                    </linearGradient>
                    <filter id="glowLine" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#4f46e5" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  
                  {/* Horizontal grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((r, idx) => {
                    const y = paddingTop + plotHeight * r;
                    const value = maxSales - (maxSales * r);
                    return (
                      <g key={idx}>
                        <line x1={paddingLeft} y1={y} x2={chartWidth - paddingRight} y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="3 3" />
                        <text x={paddingLeft - 10} y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">&#x20B9;{Math.round(value)}</text>
                      </g>
                    );
                  })}
                  
                  {/* The Area fill */}
                  {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}
                  
                  {/* The Line path with smooth curve */}
                  {linePath && <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter="url(#glowLine)" className="drop-shadow-sm" />}
                  
                  {/* Interactive circles and tooltips */}
                  {points.map((p, idx) => (
                    <g key={idx} className="group/point cursor-pointer">
                      <line x1={p.x} y1={paddingTop} x2={p.x} y2={chartHeight - paddingBottom} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" className="opacity-0 group-hover/point:opacity-100 transition-opacity duration-200" />
                      <circle cx={p.x} cy={p.y} r="5" className="fill-white stroke-emerald-600 stroke-[3] transition-all group-hover/point:r-[8] group-hover/point:stroke-[4]" />
                      
                      <g className="opacity-0 pointer-events-none group-hover/point:opacity-100 transition-all duration-300 transform group-hover/point:-translate-y-2">
                        <rect x={p.x - 50} y={p.y - 45} width="100" height="28" rx="8" className="fill-slate-800 shadow-xl" />
                        <text x={p.x} y={p.y - 27} textAnchor="middle" className="text-[11px] font-black fill-white font-mono tracking-wider">&#x20B9;{p.amount.toFixed(0)}</text>
                        <polygon points={`${p.x - 6},${p.y - 17} ${p.x + 6},${p.y - 17} ${p.x},${p.y - 11}`} className="fill-slate-800" />
                      </g>
                    </g>
                  ))}
                  
                  {/* X axis labels */}
                  {points.map((p, idx) => (
                    <text key={idx} x={p.x} y={chartHeight - 6} textAnchor="middle" className="text-[9px] font-black fill-slate-400 font-sans">{p.date}</text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Donut Chart - Order fulfillment breakdown */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm lg:col-span-4 flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-1">Orders Verification Ratio</h4>
                <p className="text-[11px] text-slate-400 font-semibold mb-6">Percentage breakdown of logistics statuses.</p>
              </div>
              
              <div className="relative flex items-center justify-center py-4">
                <svg width="160" height="160" viewBox="0 0 160 160" className="mx-auto select-none overflow-visible drop-shadow-xl">
                  {orders.length === 0 ? (
                    <circle cx="80" cy="80" r="70" fill="#f1f5f9" />
                  ) : (
                    donutSegments.map((seg, idx) => {
                      const pathD = getPieSlice(80, 80, 70, seg.startAngle, seg.endAngle);
                      const labelPos = getLabelPos(80, 80, 45, seg.startAngle, seg.endAngle);
                      const isLargest = seg.percent === Math.max(...donutSegments.map(s => s.percent));
                      const explodeOffset = isLargest ? 6 : 0;
                      const rad = ((seg.startAngle + seg.endAngle)/2 - 90) * Math.PI / 180;
                      const tx = Math.cos(rad) * explodeOffset;
                      const ty = Math.sin(rad) * explodeOffset;
                      
                      return (
                        <g key={idx} className="transition-transform duration-300 hover:scale-105 cursor-pointer" style={{ transformOrigin: '80px 80px', transform: `translate(${tx}px, ${ty}px)` }}>
                          <path d={pathD} fill={seg.color} stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                          {seg.percent > 5 && (
                            <text x={labelPos.x} y={labelPos.y + 4} textAnchor="middle" className="text-[11px] font-black fill-white font-sans drop-shadow-md">
                              {Math.round(seg.percent)}%
                            </text>
                          )}
                        </g>
                      );
                    })
                  )}
                </svg>
              </div>

              {/* Status Labels Legend Grid */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-[10px] font-bold">
                {donutSegments.map((seg, idx) => (
                  <div key={idx} className="flex items-center space-x-1.5 text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                    <span className="capitalize truncate">{seg.status} ({Math.round(seg.percent)}%)</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Catalog Insights Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Care Level Requirements */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="mb-4 flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-1">Care Requirements</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">Specimen difficulty level breakdown.</p>
                </div>
                <div className="bg-emerald-50 text-emerald-700 p-2 rounded-xl">
                  <Leaf className="h-5 w-5" />
                </div>
              </div>
              
              <div className="relative flex items-center justify-center py-4">
                <svg width="160" height="160" viewBox="0 0 160 160" className="mx-auto select-none overflow-visible drop-shadow-xl">
                  {products.length === 0 ? (
                    <circle cx="80" cy="80" r="70" fill="#f1f5f9" />
                  ) : (
                    careSegments.map((seg, idx) => {
                      const pathD = getPieSlice(80, 80, 70, seg.startAngle, seg.endAngle);
                      const labelPos = getLabelPos(80, 80, 45, seg.startAngle, seg.endAngle);
                      const isLargest = seg.percent === Math.max(...careSegments.map(s => s.percent));
                      const explodeOffset = isLargest ? 6 : 0;
                      const rad = ((seg.startAngle + seg.endAngle)/2 - 90) * Math.PI / 180;
                      const tx = Math.cos(rad) * explodeOffset;
                      const ty = Math.sin(rad) * explodeOffset;
                      
                      return (
                        <g key={idx} className="transition-transform duration-300 hover:scale-105 cursor-pointer" style={{ transformOrigin: '80px 80px', transform: `translate(${tx}px, ${ty}px)` }}>
                          <path d={pathD} fill={seg.color} stroke="#ffffff" strokeWidth="2.5" strokeLinejoin="round" />
                          {seg.percent > 5 && (
                            <text x={labelPos.x} y={labelPos.y + 4} textAnchor="middle" className="text-[11px] font-black fill-white font-sans drop-shadow-md">
                              {Math.round(seg.percent)}%
                            </text>
                          )}
                        </g>
                      );
                    })
                  )}
                </svg>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 text-[10px] font-bold text-center">
                {careSegments.map((seg, idx) => (
                  <div key={idx} className="flex flex-col items-center p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="w-3 h-3 rounded-full mb-1 shadow-sm" style={{ backgroundColor: seg.color }}></span>
                    <span className="capitalize text-slate-800">{seg.level}</span>
                    <span className="text-slate-400 font-mono mt-0.5">{seg.count} ({Math.round(seg.percent)}%)</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pricing Tier Analysis */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider mb-1">Pricing Tier Analytics</h4>
                  <p className="text-[11px] text-slate-400 font-semibold">Catalog volume grouped by price ranges.</p>
                </div>
                <div className="bg-primary-50 text-primary-700 p-2 rounded-xl">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>

              <div className="relative w-full h-[180px] mt-4 select-none">
                <svg viewBox="0 0 400 180" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#818cf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.9" />
                    </linearGradient>
                    <linearGradient id="barHoverGradient" x1="0" y1="1" x2="0" y2="0">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity="0.6" />
                      <stop offset="100%" stopColor="#4338ca" stopOpacity="1" />
                    </linearGradient>
                    <filter id="glowBar" x="-20%" y="-20%" width="140%" height="140%">
                      <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#4f46e5" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  
                  {/* Grid Lines */}
                  {[0, 0.5, 1].map((r, idx) => {
                    const y = 140 - (120 * r);
                    const value = maxPriceCount * r;
                    return (
                      <g key={idx}>
                        <line x1="20" y1={y} x2="400" y2={y} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />
                        <text x="15" y={y + 4} textAnchor="end" className="text-[10px] font-bold fill-slate-400 font-mono">{Math.round(value)}</text>
                      </g>
                    );
                  })}

                  {/* Bars */}
                  {priceTiers.map((tier, idx) => {
                    const barWidth = 60;
                    const spacing = (380 - (barWidth * 4)) / 3;
                    const x = 30 + (idx * (barWidth + spacing));
                    const heightPercent = maxPriceCount > 0 ? (tier.count / maxPriceCount) : 0;
                    const height = Math.max(heightPercent * 120, 8); // min height 8
                    const y = 140 - height;
                    
                    return (
                      <g key={idx} className="group cursor-pointer">
                        {/* Invisible hover catcher to make hovering easier */}
                        <rect x={x - spacing/2} y="0" width={barWidth + spacing} height="160" fill="transparent" />
                        
                        {/* Bar Shape */}
                        <rect 
                          x={x} 
                          y={y} 
                          width={barWidth} 
                          height={height} 
                          rx="8" 
                          fill="url(#barGradient)" 
                          className="transition-all duration-500 group-hover:fill-[url(#barHoverGradient)]"
                          filter="url(#glowBar)"
                        />
                        
                        {/* Count Label (shows on hover) */}
                        <g className="opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:-translate-y-2">
                          <rect x={x + barWidth/2 - 20} y={y - 32} width="40" height="22" rx="6" className="fill-slate-800 shadow-xl" />
                          <text x={x + barWidth/2} y={y - 17} textAnchor="middle" className="text-[11px] font-black fill-white font-mono">{tier.count}</text>
                          <polygon points={`${x + barWidth/2 - 5},${y - 10} ${x + barWidth/2 + 5},${y - 10} ${x + barWidth/2},${y - 4}`} className="fill-slate-800" />
                        </g>

                        {/* X Axis Label */}
                        <text x={x + barWidth/2} y="160" textAnchor="middle" className="text-[11px] font-extrabold fill-slate-500">{tier.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </div>

          {/* Bottom Insights Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Low Stock Alerts */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Low Stock Tracker</h4>
                  <span className="bg-rose-50 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-rose-200">{lowStockItems.length} alerts</span>
                </div>
                <p className="text-[11px] text-slate-400 font-semibold mb-4">Immediate restock recommended for specimens with 5 or less quantity.</p>
              </div>

              <div className="flex-grow space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {lowStockItems.length > 0 ? (
                  lowStockItems.map((prod) => (
                    <div key={prod.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 p-2.5 rounded-2xl">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img src={prod.image_url} className="h-9 w-9 rounded-xl object-cover shrink-0 border border-slate-200" alt={prod.name} />
                        <div className="min-w-0 text-left">
                          <h5 className="font-bold text-slate-800 text-xs truncate max-w-[120px]">{prod.name}</h5>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">Stock Left: <span className="font-bold text-rose-600">{prod.stock}</span></p>
                        </div>
                      </div>
                      <button 
                        onClick={() => {
                          setSelectedProduct(prod);
                          setProductForm({
                            name: prod.name,
                            category_id: prod.category_id,
                            price: prod.price,
                            selling_price: prod.selling_price || '',
                            stock: prod.stock,
                            image_url: prod.image_url,
                            size: prod.size,
                            care_level: prod.care_level,
                            description: prod.description,
                            show_on_home: prod.show_on_home || 0,
                            rating: prod.rating || '4.5',
                            gallery_images: prod.gallery_images || '',
                            biological_specs: prod.biological_specs || '',
                            height_cm: prod.height_cm || '',
                            pot_size: prod.pot_size || '',
                            visual_scale: prod.visual_scale || 'Desktop Scale',
                            care_guide: prod.care_guide || '',
                            delivery_info: prod.delivery_info || '',
                            perfect_for: prod.perfect_for || 'Office Desk, Gifting, Home Decor',
                            sun_exposure: prod.sun_exposure || '',
                            hydration: prod.hydration || '',
                            toxin_filtration: prod.toxin_filtration || ''
                          });
                          setProductModalOpen(true);
                        }}
                        className="text-[10px] bg-white border border-slate-250 text-slate-600 font-extrabold hover:bg-slate-50 px-3 py-1 rounded-xl transition-all cursor-pointer shadow-sm shrink-0"
                      >
                        Restock
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-350">
                    <CheckCircle className="h-8 w-8 text-emerald-500 mb-2 opacity-80" />
                    <p className="text-[10px] font-bold">All catalog items fully stocked.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Category Product Mappings progress bars */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1">Category Distribution</h4>
                <p className="text-[11px] text-slate-400 font-semibold mb-4">Distribution shares of botanical specimens.</p>
              </div>

              <div className="flex-grow space-y-4 max-h-[220px] overflow-y-auto pr-1">
                {categoryStats.slice(0, 5).map((stat) => (
                  <div key={stat.id} className="space-y-1.5 text-left">
                    <div className="flex justify-between text-[11px] font-bold text-slate-700">
                      <span className="truncate max-w-[150px]">{stat.name}</span>
                      <span className="font-mono text-slate-400">{stat.count} items ({stat.sharePercent}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div className="bg-primary-500 h-full rounded-full transition-all duration-500" style={{ width: `${stat.sharePercent}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Orders & Activities Feed */}
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
              <div>
                <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-1">Recent Logistics Events</h4>
                <p className="text-[11px] text-slate-400 font-semibold mb-4">Latest purchases in your botanical store.</p>
              </div>

              <div className="flex-grow space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                {orders.slice(0, 4).map((ord) => (
                  <div key={ord.id} className="flex items-center justify-between text-left">
                    <div className="min-w-0">
                      <h5 className="font-bold text-slate-850 text-xs truncate">{ord.customer_name}</h5>
                      <span className="text-[9px] font-bold text-slate-400 font-mono">Order #FE-00{ord.id} • &#x20B9;{parseFloat(ord.total_amount).toFixed(0)}</span>
                    </div>
                    
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 border ${
                      ord.status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                        : ord.status === 'delivered'
                        ? 'bg-green-150 text-green-900 border-green-200'
                        : ord.status === 'shipped'
                        ? 'bg-blue-50 text-blue-800 border-blue-100'
                        : ord.status === 'pending'
                        ? 'bg-amber-50 text-amber-800 border-amber-100'
                        : 'bg-rose-50 text-rose-800 border-rose-100'
                    }`}>
                      {ord.status}
                    </span>
                  </div>
                ))}
                
                {orders.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-350">
                    <ShoppingBag className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-[10px] font-bold">No recent purchases logged.</p>
                  </div>
                )}
              </div>
            </div>

          </div>
          
        </div>
      )}

      {/* ================================== TAB 2: PRODUCTS CRUD ================================== */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-slate-800">Physical Catalog</h3>
            
            <button
              onClick={openProductAddModal}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-md hover:shadow-lg flex items-center space-x-1 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Specimen</span>
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Foliage Image</th>
                    <th className="px-6 py-4">Botanical Name</th>
                    <th className="px-6 py-4">Category Mapping</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Available Stock</th>
                    <th className="px-6 py-4">Care & Size</th>
                    <th className="px-6 py-4 text-center">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {products.map((prod) => (
                    <tr key={prod.id} className="hover:bg-slate-50/40">
                      <td className="px-6 py-4 shrink-0">
                        <img 
                          src={prod.image_url} 
                          alt={prod.name} 
                          className="h-12 w-12 rounded-xl object-cover border border-slate-150 shadow-inner shrink-0"
                        />
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-800 truncate max-w-[150px]">
                        {prod.name}
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {prod.category_name}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        {prod.selling_price && parseFloat(prod.selling_price) > 0 ? (
                          <div className="flex flex-col text-left">
                            <span className="font-extrabold text-slate-900 text-sm">&#x20B9;{prod.selling_price}</span>
                            <span className="line-through text-slate-400 font-semibold text-[11px]">&#x20B9;{prod.price}</span>
                          </div>
                        ) : (
                          <span className="font-extrabold text-slate-900 text-sm">&#x20B9;{prod.price}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          parseInt(prod.stock, 10) <= 0
                            ? 'bg-slate-100 text-slate-500 border-slate-200'
                            : parseInt(prod.stock, 10) <= lowStockThreshold
                            ? 'bg-rose-50 text-rose-700 border-rose-200' 
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {prod.stock} units
                        </span>
                        {parseInt(prod.is_active, 10) === 0 && (
                          <span className="block text-[9px] font-black uppercase text-slate-400 mt-1">Hidden</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold space-y-1">
                        <div>Size: <span className="font-bold text-slate-700">{prod.size}</span></div>
                        <div>Care: <span className="font-bold text-primary-700">{prod.care_level}</span></div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center space-x-2">
                          <button
                            onClick={() => openProductEditModal(prod)}
                            className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleProductDelete(prod.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'customers' && <AdminCustomersTab onNotify={adminNotify} />}
      {activeTab === 'coupons' && <AdminCouponsTab onNotify={adminNotify} />}
      {activeTab === 'inventory' && (
        <AdminInventoryTab products={products} siteSettings={siteSettings} onRefresh={fetchAllData} onNotify={adminNotify} />
      )}

      {/* ================================== TAB 3: CATEGORIES CRUD ================================== */}
      {activeTab === 'categories' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-extrabold text-slate-800">Categories Mapping</h3>
            
            <button
              onClick={openCategoryAddModal}
              className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-md hover:shadow-lg flex items-center space-x-1 cursor-pointer transition-all"
            >
              <Plus className="h-4 w-4" />
              <span>Create Category</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat) => (
              <div 
                key={cat.id} 
                className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex items-start space-x-5 text-slate-600 hover:shadow-md transition-shadow"
              >
                <img 
                  src={cat.image_url} 
                  alt={cat.name} 
                  className="h-20 w-20 rounded-2xl object-cover border border-slate-150 shadow-inner shrink-0"
                />
                
                <div className="flex-grow space-y-2 min-w-0 text-left">
                  <h4 className="font-extrabold text-slate-900 text-base">{cat.name}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{cat.description}</p>
                  
                  <div className="mt-2 text-[10px] bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg text-slate-500 font-mono inline-block">
                    Mega Menu Link: <span className="font-bold text-slate-800 select-all ml-1">/shop?category_id={cat.id}</span>
                  </div>
                  
                  <div className="pt-2 border-t border-slate-50 flex items-center space-x-4 mt-2">
                    <button
                      onClick={() => openCategoryEditModal(cat)}
                      className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Edit2 className="h-3 w-3" />
                      <span>Edit Mapping</span>
                    </button>
                    <button
                      onClick={() => handleCategoryDelete(cat.id)}
                      className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center space-x-0.5 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ================================== TAB 4: ORDERS CONTROL ================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h3 className="text-2xl font-extrabold text-slate-800 tracking-tight">Order Management</h3>
              <p className="text-slate-400 text-sm mt-1">Monitor, authorize, and fulfill customer purchases.</p>
            </div>
            
            {/* Quick Metrics Banner */}
            <div className="flex flex-wrap items-center gap-4 mt-4 md:mt-0 bg-white px-6 py-3 rounded-2xl border border-slate-100 shadow-sm">
              <div className="flex flex-col text-center border-r border-slate-100 pr-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
                <span className="text-lg font-black text-slate-800">{orders.length}</span>
              </div>
              <div className="flex flex-col text-center border-r border-slate-100 pr-4">
                <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Revenue</span>
                <span className="text-lg font-black text-slate-800">₹{orders.reduce((acc, curr) => acc + parseFloat(curr.total_amount), 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex flex-col text-center border-r border-slate-100 pr-4">
                <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider">Pending</span>
                <span className="text-lg font-black text-slate-800">{orders.filter(o => o.status === 'pending').length}</span>
              </div>
              <div className="flex flex-col text-center border-r border-slate-100 pr-4">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Paid</span>
                <span className="text-lg font-black text-slate-800">{orders.filter(o => o.status === 'paid').length}</span>
              </div>
              <div className="flex flex-col text-center border-r border-slate-100 pr-4">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Shipped</span>
                <span className="text-lg font-black text-slate-800">{orders.filter(o => o.status === 'shipped').length}</span>
              </div>
              <div className="flex flex-col text-center border-r border-slate-100 pr-4">
                <span className="text-[10px] font-bold text-green-500 uppercase tracking-wider">Delivered</span>
                <span className="text-lg font-black text-slate-800">{orders.filter(o => o.status === 'delivered').length}</span>
              </div>
              <div className="flex flex-col text-center">
                <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">Failed</span>
                <span className="text-lg font-black text-slate-800">{orders.filter(o => o.status === 'failed').length}</span>
              </div>
            </div>
          </div>

          {/* Filters & tools */}
          <div className="bg-white border border-slate-100 rounded-[28px] shadow-sm overflow-hidden">
            <button
              type="button"
              onClick={() => setShowOrderFilters(!showOrderFilters)}
              className="w-full flex items-center justify-between px-6 py-4 bg-slate-50 border-b border-slate-100 hover:bg-slate-100/80 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Filter className="h-4 w-4 text-primary-600" />
                <span>Order Filters</span>
                <span className="text-[10px] font-semibold text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  {filteredOrders.length} / {orders.length} orders
                </span>
              </div>
              {showOrderFilters ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
            </button>

            {showOrderFilters && (
              <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Status</label>
                  <select
                    value={orderFilters.status}
                    onChange={(e) => setOrderFilters({ ...orderFilters, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary-500"
                  >
                    {ORDER_STATUS_OPTIONS.map((o) => (
                      <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Date range</label>
                  <select
                    value={orderFilters.dateRange}
                    onChange={(e) => setOrderFilters({ ...orderFilters, dateRange: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary-500"
                  >
                    {DATE_RANGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Payment</label>
                  <select
                    value={orderFilters.payment}
                    onChange={(e) => setOrderFilters({ ...orderFilters, payment: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-primary-500"
                  >
                    {PAYMENT_FILTER_OPTIONS.map((o) => (
                      <option key={o.value || 'all'} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Search (Order ID / Customer)</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="ORD-000042 or name"
                      value={orderFilters.search}
                      onChange={(e) => setOrderFilters({ ...orderFilters, search: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Min price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={orderFilters.minPrice}
                    onChange={(e) => setOrderFilters({ ...orderFilters, minPrice: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase text-slate-400">Max price (₹)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Any"
                    value={orderFilters.maxPrice}
                    onChange={(e) => setOrderFilters({ ...orderFilters, maxPrice: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-primary-500"
                  />
                </div>
                <div className="md:col-span-2 flex flex-wrap items-end gap-2">
                  <button type="button" onClick={resetOrderFilters} className="text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-full">
                    Reset filters
                  </button>
                  <button
                    type="button"
                    onClick={() => exportOrdersToCsv(filteredOrders, `orders_${new Date().toISOString().slice(0, 10)}.csv`)}
                    className="text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200 px-4 py-2 rounded-full flex items-center gap-1.5"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV / Excel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Bulk actions bar */}
          {selectedOrderIds.length > 0 && (
            <div className="bg-primary-50 border border-primary-200 rounded-2xl px-6 py-3 flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-primary-800">{selectedOrderIds.length} selected</span>
              <button type="button" disabled={actionLoading} onClick={() => handleBulkOrderStatus('shipped')} className="text-[10px] font-bold bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                Mark as Shipped
              </button>
              <button type="button" disabled={actionLoading} onClick={() => handleBulkOrderStatus('delivered')} className="text-[10px] font-bold bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 disabled:opacity-50">
                Mark as Delivered
              </button>
              <button type="button" disabled={actionLoading} onClick={() => handleBulkOrderStatus('failed')} className="text-[10px] font-bold bg-rose-600 text-white px-3 py-1.5 rounded-lg hover:bg-rose-700 disabled:opacity-50">
                Mark as Failed
              </button>
              <button type="button" onClick={() => setSelectedOrderIds([])} className="text-[10px] font-bold text-slate-500 hover:text-slate-800 ml-auto">
                Clear selection
              </button>
            </div>
          )}

          <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm card-premium-shadow">
            <div className="bg-slate-50 border-b border-slate-100 px-8 py-5 flex justify-between items-center flex-wrap gap-3">
              <h4 className="font-bold text-slate-700">Latest Transactions</h4>
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">
                <Filter className="h-3 w-3 text-primary-500" />
                <span>Showing {filteredOrders.length} of {orders.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-white text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                  <tr>
                    <th className="px-4 py-5 w-10">
                      <button type="button" onClick={toggleSelectAllFiltered} className="text-slate-400 hover:text-primary-600" title="Select all filtered">
                        {filteredOrders.length > 0 && filteredOrders.every((o) => selectedOrderIds.includes(o.id))
                          ? <CheckSquare className="h-4 w-4 text-primary-600" />
                          : <Square className="h-4 w-4" />}
                      </button>
                    </th>
                    <th className="px-4 py-5">Receipt ID</th>
                    <th className="px-6 py-5">Customer</th>
                    <th className="px-6 py-5">Payment</th>
                    <th className="px-6 py-5">Tags</th>
                    <th className="px-6 py-5">Date</th>
                    <th className="px-6 py-5">Total</th>
                    <th className="px-6 py-5">Status</th>
                    <th className="px-6 py-5">Logistics</th>
                    <th className="px-6 py-5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-8 py-16 text-center text-slate-400 font-semibold text-sm">
                        No orders match your filters.
                      </td>
                    </tr>
                  ) : filteredOrders.map((ord) => {
                    const tags = getOrderSmartTags(ord, orders, customerOrderCounts);
                    const pay = getPaymentMethod(ord);
                    return (
                    <tr key={ord.id} className={`hover:bg-slate-50/50 transition-colors ${selectedOrderIds.includes(ord.id) ? 'bg-primary-50/30' : ''}`}>
                      <td className="px-4 py-5">
                        <button type="button" onClick={() => toggleOrderSelect(ord.id)} className="text-slate-400 hover:text-primary-600">
                          {selectedOrderIds.includes(ord.id) ? <CheckSquare className="h-4 w-4 text-primary-600" /> : <Square className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-5">
                        <span className="font-extrabold text-slate-900 bg-slate-100 px-3 py-1.5 rounded-lg font-mono text-xs">
                          {formatOrderNumber(ord.id)}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs uppercase shadow-sm">
                            {ord.customer_name?.charAt(0) || 'U'}
                          </div>
                          <span className="font-bold text-slate-700">{ord.customer_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${pay === 'cod' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-blue-50 text-blue-800 border border-blue-200'}`}>
                          {pay === 'cod' ? <Banknote className="h-3 w-3" /> : <CreditCard className="h-3 w-3" />}
                          {pay === 'cod' ? 'COD' : 'Online'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1 max-w-[140px]">
                          {tags.map((t) => (
                            <span key={t.key} className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${t.className}`}>{t.label}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-xs font-semibold text-slate-500">
                        {new Date(ord.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-6 py-5 font-black text-slate-900">
                        ₹{parseFloat(ord.total_amount).toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-5">
                        <span className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm ${
                          ord.status === 'paid' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                            : ord.status === 'delivered' ? 'bg-green-100 text-green-950 border-green-200'
                            : ord.status === 'shipped' ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                            : ord.status === 'pending' ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-rose-50 text-rose-800 border-rose-200'
                        }`}>
                          <span>{ord.status}</span>
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <select
                          value={ord.status}
                          onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                          className="bg-white border border-slate-200 text-xs font-bold text-slate-700 py-2 px-3 rounded-xl outline-none cursor-pointer"
                        >
                          <option value="pending">Pending</option>
                          <option value="paid">Paid</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="failed">Failed</option>
                        </select>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <a href={`tel:${ord.phone}`} title="Call" className="inline-flex h-8 w-8 items-center justify-center text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg">
                            <PhoneCall className="h-3.5 w-3.5" />
                          </a>
                          <button onClick={() => fetchOrderDetails(ord.id)} title="Inspect" className="inline-flex h-8 w-8 items-center justify-center text-primary-600 bg-primary-50 hover:bg-primary-600 hover:text-white rounded-lg">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================================== TAB 5: MEGA MENU MAPPING ================================== */}
      {activeTab === 'mega_menu' && (() => {
        const uniqueCategoryGroups = Array.from(new Set(megaMenuLinks.map(link => link.category_group)));
        return (
          <div className="space-y-6 animate-fade-in text-left">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-extrabold text-slate-800">Shop Mega Menu Links Mapping</h3>
              
              <button
                onClick={openMegaMenuAddModal}
                className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs px-4 py-2.5 rounded-full shadow-md hover:shadow-lg flex items-center space-x-1 cursor-pointer transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add Mega Link</span>
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* COLUMN 1: DYNAMIC CATEGORY COLUMNS (GROUPS) CONTROL */}
              <div className="space-y-6">
                <div className="bg-slate-50 border border-slate-100 rounded-3xl p-6 space-y-6">
                  <div>
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-wider">Category Groups (Columns)</h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-semibold">Columns displayed in the Shop dropdown menu.</p>
                  </div>

                  <div className="space-y-3">
                    {uniqueCategoryGroups.map((group) => {
                      const linksCount = megaMenuLinks.filter(l => l.category_group === group).length;
                      return (
                        <div key={group} className="flex justify-between items-center bg-white border border-slate-100/70 p-3 rounded-2xl shadow-sm">
                          <div className="truncate pr-2">
                            <span className="font-extrabold text-xs text-slate-800 block truncate">{group}</span>
                            <span className="text-[10px] text-slate-400 font-semibold">{linksCount} active link{linksCount !== 1 ? 's' : ''}</span>
                          </div>
                          <button
                            onClick={() => handleMegaMenuDeleteCategoryGroup(group)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-full transition-all cursor-pointer shrink-0"
                            title="Delete entire column category"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      );
                    })}
                    {uniqueCategoryGroups.length === 0 && (
                      <div className="text-center py-6 text-xs text-slate-400 font-semibold">No category columns found.</div>
                    )}
                  </div>

                  {/* QUICK ADD NEW CATEGORY COLUMN */}
                  <div className="border-t border-slate-200/60 pt-4 space-y-3 text-left">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Create Category Column</h5>
                    <form 
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const newGroup = e.target.new_group_name.value.trim();
                        if (!newGroup) return;
                        setActionLoading(true);
                        try {
                          const res = await axios.post(`${API_BASE_URL}/mega_menu.php`, {
                            title: 'All Products',
                            url: '/shop',
                            category_group: newGroup
                          });
                          if (res.data.success) {
                            setSuccess(`Category column "${newGroup}" created with placeholder successfully.`);
                            e.target.reset();
                            fetchAllData();
                          }
                          handleAlertTimeout();
                        } catch (err) {
                          setError('Failed to create category column.');
                        } finally {
                          setActionLoading(false);
                        }
                      }}
                      className="flex gap-2"
                    >
                      <input
                        type="text"
                        name="new_group_name"
                        required
                        placeholder="e.g. Seasonal Plants"
                        className="flex-grow bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold placeholder-slate-400 outline-none focus:border-primary-500 shadow-inner"
                      />
                      <button
                        type="submit"
                        disabled={actionLoading}
                        className="bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs p-2.5 rounded-xl cursor-pointer shadow-sm transition-all"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* COLUMN 2 & 3: INDIVIDUAL LINK NODES TABLE */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-100 text-xs font-bold text-slate-400 uppercase tracking-wider">
                        <tr>
                          <th className="px-6 py-4">Link ID</th>
                          <th className="px-6 py-4">Link Title</th>
                          <th className="px-6 py-4">Routing / URL Path</th>
                          <th className="px-6 py-4">Column Category Group</th>
                          <th className="px-6 py-4 text-center">Manage</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {megaMenuLinks.map((link) => (
                          <tr key={link.id} className="hover:bg-slate-50/40">
                            <td className="px-6 py-4 font-bold text-slate-800">
                              #MN-00{link.id}
                            </td>
                            <td className="px-6 py-4 font-extrabold text-slate-800">
                              {link.title}
                            </td>
                            <td className="px-6 py-4 font-semibold text-slate-500 font-mono text-xs">
                              {link.url}
                            </td>
                            <td className="px-6 py-4">
                              <span className="inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary-50 text-primary-700 border border-primary-100">
                                {link.category_group}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <button
                                  onClick={() => openMegaMenuEditModal(link)}
                                  className="p-2 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors cursor-pointer"
                                  title="Edit Link Node"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleMegaMenuDelete(link.id)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                                  title="Delete Link Node"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ================================== TAB 5: CONTACT INQUIRIES ================================== */}
      {activeTab === 'inquiries' && (
        <div className="bg-white border border-slate-100 rounded-[35px] p-6 sm:p-8 shadow-sm animate-fade-in text-left space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-extrabold text-slate-800">Customer Channel Inquiries</h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">Review and respond to submissions registered from the public Contact page.</p>
            </div>
            
            <div className="bg-slate-50 border border-slate-100 rounded-full px-4 py-2 flex items-center space-x-2 text-xs font-bold text-slate-500 shadow-inner">
              <span>Total Inquiries:</span>
              <span className="bg-primary-600 text-white rounded-full h-5 px-2 flex items-center justify-center font-extrabold text-[10px]">
                {inquiries.length}
              </span>
              <span className="text-slate-300">|</span>
              <span className="text-red-500">Unread:</span>
              <span className="bg-red-500 text-white rounded-full h-5 px-2 flex items-center justify-center font-extrabold text-[10px]">
                {inquiries.filter(i => i.status === 'unread').length}
              </span>
            </div>
          </div>

          {inquiries.length === 0 ? (
            <div className="text-center py-16 bg-slate-50 rounded-[28px] border border-dashed border-slate-200">
              <span className="text-4xl">📬</span>
              <h4 className="text-slate-700 font-extrabold mt-3 text-sm">Inbox is Empty</h4>
              <p className="text-slate-400 text-xs mt-1 max-w-xs mx-auto font-semibold">
                No customer inquiries have been submitted via the Contact form yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-100 rounded-[24px]">
              <table className="w-full text-sm text-left text-slate-600">
                <thead className="text-[10px] text-slate-400 uppercase tracking-widest bg-slate-50/50 border-b border-slate-100 font-black">
                  <tr>
                    <th scope="col" className="px-6 py-4">Sender Coordinates</th>
                    <th scope="col" className="px-6 py-4">Subject</th>
                    <th scope="col" className="px-6 py-4">Submitted Date</th>
                    <th scope="col" className="px-6 py-4 text-center">Status</th>
                    <th scope="col" className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {inquiries.map((inquiry) => (
                    <tr 
                      key={inquiry.id} 
                      className={`hover:bg-slate-50/50 transition-colors ${
                        inquiry.status === 'unread' ? 'bg-primary-50/20 font-semibold' : ''
                      }`}
                    >
                      <td className="px-6 py-4 space-y-1">
                        <div className="text-slate-800 font-extrabold flex items-center gap-1.5">
                          {inquiry.name}
                          {inquiry.status === 'unread' && (
                            <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 font-semibold break-all">{inquiry.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-800 font-bold max-w-xs truncate">{inquiry.subject}</div>
                        <div className="text-xs text-slate-400 max-w-xs truncate mt-0.5">{inquiry.message}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500">
                        {new Date(inquiry.created_at).toLocaleString('en-IN', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => handleToggleInquiryStatus(inquiry.id, inquiry.status)}
                          className={`inline-block px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer border ${
                            inquiry.status === 'unread' 
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                              : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                          }`}
                        >
                          {inquiry.status}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center space-x-2">
                          <button
                            onClick={() => {
                              setSelectedInquiry(inquiry);
                              // Mark as read automatically when viewing if unread
                              if (inquiry.status === 'unread') {
                                handleToggleInquiryStatus(inquiry.id, 'unread');
                              }
                            }}
                            className="flex items-center space-x-1 bg-primary-50 text-primary-600 hover:bg-primary-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border border-primary-100 shadow-sm"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            <span>Read</span>
                          </button>
                          <button
                            onClick={() => handleDeleteInquiry(inquiry.id)}
                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================================== MODAL: INQUIRY DETAILS VIEW ================================== */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedInquiry(null)}></div>
          
          <div className="relative bg-white border border-slate-100 max-w-lg w-full rounded-[35px] p-6 sm:p-8 shadow-2xl z-50 overflow-y-auto max-h-[90vh] animate-fade-in text-left">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-primary-50 text-primary-700 border border-primary-100 mb-1">
                  Customer Inquiry Coordinates
                </span>
                <h3 className="font-extrabold text-slate-900 text-lg leading-snug">
                  {selectedInquiry.subject}
                </h3>
              </div>
              <button onClick={() => setSelectedInquiry(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 text-sm text-slate-600 font-semibold font-sans">
              
              {/* Sender Details */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="text-[10px] uppercase text-slate-400 tracking-wider">Sender Name</h4>
                  <p className="text-slate-800 font-extrabold mt-0.5">{selectedInquiry.name}</p>
                </div>
                <div>
                  <h4 className="text-[10px] uppercase text-slate-400 tracking-wider">Email Address</h4>
                  <a href={`mailto:${selectedInquiry.email}`} className="text-primary-600 hover:underline font-extrabold mt-0.5 block break-all">
                    {selectedInquiry.email}
                  </a>
                </div>
                <div className="col-span-2 border-t border-slate-100 pt-3">
                  <h4 className="text-[10px] uppercase text-slate-400 tracking-wider">Submitted On</h4>
                  <p className="text-slate-500 font-bold mt-0.5">
                    {new Date(selectedInquiry.created_at).toLocaleString('en-IN', {
                      dateStyle: 'long',
                      timeStyle: 'medium'
                    })}
                  </p>
                </div>
              </div>

              {/* Message Details */}
              <div className="space-y-1">
                <h4 className="text-[10px] uppercase text-slate-400 tracking-wider">Inquiry Body Message</h4>
                <div className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl p-5 text-slate-700 font-medium leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap font-sans">
                  {selectedInquiry.message}
                </div>
              </div>

              {/* Reply Coordinates */}
              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <a
                  href={`mailto:${selectedInquiry.email}?subject=RE: ${encodeURIComponent(selectedInquiry.subject)}`}
                  className="flex-grow bg-primary-600 hover:bg-primary-700 text-white font-extrabold py-3 rounded-full text-xs text-center shadow-md hover:shadow-lg transition-all"
                >
                  📨 Compose Email Response
                </a>
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold px-6 py-3 rounded-full text-xs transition-colors cursor-pointer"
                >
                  Close Message
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ================================== TAB 6: WEBSITE SETTINGS ================================== */}
      {activeTab === 'settings' && (
        <div className="w-full max-w-none animate-fade-in text-left">
          <div className="bg-white border border-slate-100 rounded-2xl sm:rounded-[35px] p-4 sm:p-6 lg:p-8 shadow-sm w-full">
          <div className="mb-6 sm:mb-8 pb-4 border-b border-slate-100">
            <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800">Website Configuration Settings</h3>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 font-semibold">Manage site-wide contact, checkout, invoice, footer, and homepage content.</p>
          </div>

          <form onSubmit={handleSettingsSubmit} className="space-y-8 sm:space-y-10 text-sm text-slate-600 font-semibold font-sans w-full">
            
            {/* Invoice template editor */}
            <div className="space-y-4 pt-2 pb-6 border-b border-slate-100">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Invoice Content (Print / PDF)</h4>
                <p className="text-[11px] text-slate-400 mt-1">Full control over text shown on customer & admin invoices.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Company name</label>
                  <input type="text" value={siteSettings.invoice_company_name || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_company_name: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Tagline</label>
                  <input type="text" value={siteSettings.invoice_tagline || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_tagline: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Document title</label>
                  <input type="text" value={siteSettings.invoice_title || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_title: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" placeholder="TAX INVOICE" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Brand color (hex)</label>
                  <input type="text" value={siteSettings.invoice_primary_color || '#059669'} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_primary_color: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm font-mono" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Billed-to heading</label>
                  <input type="text" value={siteSettings.invoice_billed_heading || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_billed_heading: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Shipping heading</label>
                  <input type="text" value={siteSettings.invoice_ship_heading || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_ship_heading: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Table column: item description</label>
                  <input type="text" value={siteSettings.invoice_table_heading || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_table_heading: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">GST / legal note (under logo, optional)</label>
                  <input type="text" value={siteSettings.invoice_gst_note || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_gst_note: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" placeholder="GSTIN: ..." />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Footer — thank you line</label>
                  <input type="text" value={siteSettings.invoice_footer_thanks || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_footer_thanks: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Footer — support line</label>
                  <textarea rows="2" value={siteSettings.invoice_footer_support || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_footer_support: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm resize-none" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Footer — legal disclaimer</label>
                  <textarea rows="2" value={siteSettings.invoice_footer_legal || ''} onChange={(e) => setSiteSettings({ ...siteSettings, invoice_footer_legal: e.target.value })} className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-sm resize-none" />
                </div>
              </div>
            </div>

            {/* Secure Shipping — full admin control */}
            <div className="space-y-4 p-4 sm:p-5 bg-indigo-50/40 border border-indigo-100 rounded-2xl w-full mb-6">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800 flex items-center gap-2"><Truck className="h-4 w-4 text-indigo-600" /> Secure Shipping (Cart & Checkout)</h4>
                <p className="text-[11px] text-slate-400 mt-1">Fees sync to cart, checkout, Razorpay amount, and orders.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" checked={siteSettings.shipping_enabled !== '0'} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_enabled: e.target.checked ? '1' : '0' })} className="h-4 w-4 rounded accent-indigo-600" />
                <span className="text-sm font-bold text-slate-700">Enable shipping charges</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Label (cart line)</label>
                  <input type="text" value={siteSettings.shipping_label || ''} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_label: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" placeholder="Secure Shipping" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Standard fee (₹)</label>
                  <input type="number" min="0" value={siteSettings.shipping_fee ?? '99'} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_fee: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Free shipping above (₹)</label>
                  <input type="number" min="0" value={siteSettings.shipping_free_threshold ?? '999'} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_free_threshold: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Est. delivery text</label>
                  <input type="text" value={siteSettings.shipping_estimated_days || ''} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_estimated_days: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">COD extra fee (₹)</label>
                  <input type="number" min="0" value={siteSettings.shipping_cod_extra_fee ?? '0'} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_cod_extra_fee: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Insurance fee (₹)</label>
                  <input type="number" min="0" value={siteSettings.shipping_insurance_fee ?? '0'} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_insurance_fee: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Zones / packaging note</label>
                  <textarea rows="2" value={siteSettings.shipping_zones_note || ''} onChange={(e) => setSiteSettings({ ...siteSettings, shipping_zones_note: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none" />
                </div>
              </div>
            </div>

            {/* Inventory alerts */}
            <div className="space-y-4 p-4 sm:p-5 bg-amber-50/40 border border-amber-100 rounded-2xl w-full mb-6">
              <h4 className="text-sm font-extrabold text-slate-800">Inventory Alerts</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Low stock threshold (units)</label>
                  <input type="number" min="1" value={siteSettings.low_stock_threshold ?? '5'} onChange={(e) => setSiteSettings({ ...siteSettings, low_stock_threshold: e.target.value })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm" />
                </div>
                <label className="flex items-center gap-3 cursor-pointer pt-6">
                  <input type="checkbox" checked={siteSettings.auto_disable_out_of_stock !== '0'} onChange={(e) => setSiteSettings({ ...siteSettings, auto_disable_out_of_stock: e.target.checked ? '1' : '0' })} className="h-4 w-4 rounded accent-amber-600" />
                  <span className="text-sm font-bold text-slate-700">Auto-hide products when stock = 0</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 xl:gap-8 pb-6 border-b border-slate-100">
            {/* COD checkout controls */}
            <div className="space-y-4 p-4 sm:p-5 bg-slate-50/50 border border-slate-100 rounded-2xl h-fit">
              <div>
                <h4 className="text-sm font-extrabold text-slate-800">Cash on Delivery (Checkout)</h4>
                <p className="text-[11px] text-slate-400 mt-1">Control whether customers can pay COD at checkout and the minimum order value.</p>
              </div>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={siteSettings.cod_enabled === '1' || siteSettings.cod_enabled === 1}
                  onChange={(e) => setSiteSettings({ ...siteSettings, cod_enabled: e.target.checked ? '1' : '0' })}
                  className="h-4 w-4 rounded accent-primary-600"
                />
                <span className="text-sm font-bold text-slate-700">Enable COD on checkout</span>
              </label>
              <div className="space-y-1 max-w-md">
                <label className="text-xs uppercase tracking-wider text-slate-400">Minimum order for COD (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={siteSettings.cod_min_order ?? '499'}
                  onChange={(e) => setSiteSettings({ ...siteSettings, cod_min_order: e.target.value })}
                  className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner"
                  placeholder="499"
                />
              </div>
            </div>

            {/* Contact & social */}
            <div className="space-y-4">
              <h4 className="text-sm font-extrabold text-slate-800">Contact & Store Details</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs uppercase tracking-wider text-slate-400">Support Email Coordinate</label>
              <input
                type="email"
                required
                value={siteSettings.contact_email || ''}
                onChange={(e) => setSiteSettings({ ...siteSettings, contact_email: e.target.value })}
                className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner"
                placeholder="e.g. hello@floraelegance.com"
              />
            </div>

            <div className="space-y-1 sm:col-span-2 lg:col-span-1">
              <label className="text-xs uppercase tracking-wider text-slate-400">Helpline / Nursery Contact Helpline</label>
              <input
                type="text"
                required
                value={siteSettings.contact_phone || ''}
                onChange={(e) => setSiteSettings({ ...siteSettings, contact_phone: e.target.value })}
                className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner"
                placeholder="e.g. +91 98765 43210"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Botanical Showroom Street Address</label>
              <textarea
                required
                rows="3"
                value={siteSettings.contact_address || ''}
                onChange={(e) => setSiteSettings({ ...siteSettings, contact_address: e.target.value })}
                className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner resize-none"
                placeholder="e.g. 101 Greenhouse Tower, Bengaluru"
              ></textarea>
            </div>

            <div className="space-y-1">
              <label className="text-xs uppercase tracking-wider text-slate-400">Nursery Visiting & Operating Hours</label>
              <input
                type="text"
                required
                value={siteSettings.contact_working_hours || ''}
                onChange={(e) => setSiteSettings({ ...siteSettings, contact_working_hours: e.target.value })}
                className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner"
                placeholder="e.g. Monday - Saturday: 09:00 AM - 07:00 PM"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Google Map Iframe Embed Code</label>
              <textarea
                required
                rows="3"
                value={siteSettings.contact_map_iframe || ''}
                onChange={(e) => setSiteSettings({ ...siteSettings, contact_map_iframe: e.target.value })}
                className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner resize-none text-xs font-mono"
                placeholder='<iframe src="..."></iframe>'
              ></textarea>
            </div>
              </div>

            <div className="space-y-3 pt-2">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Social Media Connectivity</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <input
                  type="text"
                  value={siteSettings.footer_social_facebook || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, footer_social_facebook: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium shadow-inner text-xs"
                  placeholder="Facebook URL"
                />
                <input
                  type="text"
                  value={siteSettings.footer_social_instagram || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, footer_social_instagram: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium shadow-inner text-xs"
                  placeholder="Instagram URL"
                />
                <input
                  type="text"
                  value={siteSettings.footer_social_twitter || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, footer_social_twitter: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium shadow-inner text-xs"
                  placeholder="Twitter URL"
                />
              </div>
            </div>
            </div>
            </div>

            {/* Shop Page Filter Options */}
            <div className="space-y-4 pt-4 border-t border-slate-100 w-full">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Shop Page Filter Configuration</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-full">
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">Care Levels (Comma-separated)</label>
                  <input
                    type="text"
                    required
                    value={siteSettings.shop_care_levels || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, shop_care_levels: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner text-xs"
                    placeholder="e.g. Easy,Moderate,Expert"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">Plant Dimensions / Sizes (Comma-separated)</label>
                  <input
                    type="text"
                    required
                    value={siteSettings.shop_sizes || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, shop_sizes: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner text-xs"
                    placeholder="e.g. Small,Medium,Large"
                  />
                </div>
              </div>
            </div>

            {/* Sticky Promo Offer Bar */}
            <div className="space-y-4 pt-4 border-t border-slate-100 w-full">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Sticky Promo Offer Bar Banner</label>
              
              <div className="space-y-3 bg-slate-50/50 p-4 sm:p-5 border border-slate-100 rounded-2xl max-w-3xl lg:max-w-none">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 font-bold">Show Banner Promo Bar</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={siteSettings.offer_bar_show === "1" || siteSettings.offer_bar_show === 1}
                      onChange={(e) => setSiteSettings({ ...siteSettings, offer_bar_show: e.target.checked ? "1" : "0" })}
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
                
                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">Promo Bar Content Text</label>
                  <input
                    type="text"
                    value={siteSettings.offer_bar_text || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, offer_bar_text: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-xs"
                    placeholder="e.g. 🌱 Free Delivery above ₹499 | 🎁 Flat 10% OFF - Code: GREEN10"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-500 font-bold">Countdown Expiry Date (YYYY-MM-DD HH:MM:SS) - Optional</label>
                  <input
                    type="text"
                    value={siteSettings.offer_bar_countdown || ''}
                    onChange={(e) => setSiteSettings({ ...siteSettings, offer_bar_countdown: e.target.value })}
                    className="w-full bg-white border border-slate-200 focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner text-xs"
                    placeholder="e.g. 2026-06-30 23:59:59 (Leave empty to disable countdown)"
                  />
                </div>
              </div>
            </div>

            {/* Footer Groups Mapping */}
            <div className="space-y-4 pt-4 border-t border-slate-100 w-full">
              <label className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Footer Navigation Groups</label>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
              {/* Group 1 */}
              <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-3">
                <input
                  type="text"
                  value={siteSettings.footer_group1_title || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, footer_group1_title: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-black shadow-inner text-sm text-slate-800"
                  placeholder="Group 1 Title (e.g. Shop Categories)"
                />
                <textarea
                  rows="4"
                  value={siteSettings.footer_group1_links || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, footer_group1_links: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-mono text-xs shadow-inner resize-none leading-relaxed"
                  placeholder="Format: Label|URL (one per line)&#10;Indoor Plants|/shop?category_id=1"
                ></textarea>
              </div>

              {/* Group 2 */}
              <div className="p-4 sm:p-5 border border-slate-100 rounded-2xl bg-white shadow-sm space-y-3">
                <input
                  type="text"
                  value={siteSettings.footer_group2_title || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, footer_group2_title: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-black shadow-inner text-sm text-slate-800"
                  placeholder="Group 2 Title (e.g. Botanical Guides)"
                />
                <textarea
                  rows="4"
                  value={siteSettings.footer_group2_links || ''}
                  onChange={(e) => setSiteSettings({ ...siteSettings, footer_group2_links: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-mono text-xs shadow-inner resize-none leading-relaxed"
                  placeholder="Format: Label|URL (one per line)&#10;Watering Guide|/guide"
                ></textarea>
              </div>
              </div>
            </div>

            {/* Home Hero Carousel Images Array */}
            <div className="space-y-3 pt-4 border-t border-slate-100 w-full">
              <div className="flex justify-between items-center">
                <label className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Homepage Hero Slider Images</label>
                <label className="cursor-pointer bg-primary-50 text-primary-600 hover:bg-primary-100 font-bold py-1.5 px-3 rounded-lg text-[10px] flex items-center transition-colors shadow-sm">
                  {uploadingImage ? 'Uploading...' : '+ Add Slide Image'}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'hero_image_add')} disabled={uploadingImage} />
                </label>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
                {siteSettings.hero_images && siteSettings.hero_images.split(',').filter(x => x.trim() !== '').map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden shadow-sm border border-slate-200 aspect-video bg-slate-100">
                    <img src={url} alt={`Hero ${idx}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const arr = siteSettings.hero_images.split(',').filter(x => x.trim() !== '');
                        arr.splice(idx, 1);
                        setSiteSettings({ ...siteSettings, hero_images: arr.join(',') });
                      }}
                      className="absolute top-1 right-1 bg-white/90 text-red-500 hover:text-white hover:bg-red-500 p-1.5 rounded-full backdrop-blur-sm transition-all shadow-sm opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {(!siteSettings.hero_images || siteSettings.hero_images.trim() === '') && (
                  <div className="col-span-2 sm:col-span-4 text-xs text-slate-400 font-medium py-4 text-center bg-slate-50 border border-dashed rounded-xl">
                    No custom hero images uploaded. Default placeholder will be used.
                  </div>
                )}
              </div>
              <textarea
                rows="2"
                value={siteSettings.hero_images || ''}
                onChange={(e) => setSiteSettings({ ...siteSettings, hero_images: e.target.value })}
                className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-3 outline-none font-medium shadow-inner text-xs resize-none"
                placeholder="Or comma-separated absolute image URLs..."
              ></textarea>
            </div>

            {/* Submit Button */}
            <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:justify-end gap-3">
              <button
                type="submit"
                disabled={actionLoading}
                className="w-full sm:w-auto sm:min-w-[220px] bg-primary-600 hover:bg-primary-700 text-white font-extrabold py-3.5 px-8 rounded-full text-xs flex items-center justify-center space-x-2 shadow-md hover:shadow-lg cursor-pointer transition-all"
              >
                {actionLoading ? 'Saving Configurations...' : 'Save Settings'}
              </button>
            </div>

          </form>
          </div>
        </div>
      )}
      {/* ================================== TAB 7: PRODUCT REVIEWS ================================== */}
      {activeTab === 'reviews' && (
        <div className="space-y-6 animate-fade-in text-left">
          <div className="bg-white border border-slate-100 rounded-[35px] p-6 sm:p-8 shadow-sm">
            <h3 className="text-xl font-extrabold text-slate-800">All Product Reviews</h3>
            <p className="text-xs text-slate-400 mt-1 font-semibold">Monitor and moderate reviews submitted by users on all botanical species.</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-[35px] overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-400 font-extrabold border-b border-slate-100">
                    <th className="px-6 py-4">Product</th>
                    <th className="px-6 py-4">User Details</th>
                    <th className="px-6 py-4">Rating & Review</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
                  {allReviews.length > 0 ? (
                    allReviews.map((review) => (
                      <tr key={review.id} className="hover:bg-slate-50/50 transition-colors">
                        {/* Product Info */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-3">
                            <img
                              src={review.product_image || 'https://images.unsplash.com/photo-1545241047-6083a3684587'}
                              alt={review.product_name}
                              className="h-10 w-10 rounded-xl object-cover border border-slate-200"
                            />
                            <div>
                              <span className="font-extrabold text-slate-800 text-sm block">{review.product_name || 'Deleted Product'}</span>
                              <span className="text-[10px] text-slate-400">ID: #{review.product_id}</span>
                            </div>
                          </div>
                        </td>

                        {/* Reviewer Details */}
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {review.user_image ? (
                              <img
                                src={review.user_image}
                                alt={review.user_name}
                                className="h-7 w-7 rounded-full object-cover border"
                              />
                            ) : (
                              <div className="h-7 w-7 rounded-full bg-slate-100 text-slate-500 font-bold flex items-center justify-center text-[10px] uppercase">
                                {review.user_name ? review.user_name.charAt(0) : 'U'}
                              </div>
                            )}
                            <div>
                              <span className="block font-bold text-slate-800">{review.user_name || 'Guest'}</span>
                              <span className="text-[9px] text-slate-400 font-medium">
                                {new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Rating & Comment */}
                        <td className="px-6 py-4 max-w-sm">
                          <div className="flex text-amber-500 mb-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star key={s} className={`h-3 w-3 ${s <= review.rating ? 'fill-amber-500' : 'text-slate-200'}`} />
                            ))}
                          </div>
                          <p className="text-slate-500 leading-relaxed font-sans text-xs line-clamp-2">{review.comment}</p>
                        </td>

                        {/* Status badge */}
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            review.status === 'approved' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border border-slate-200'
                          }`}>
                            {review.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleReviewStatusToggle(review.id, review.status)}
                              title={review.status === 'approved' ? 'Hide Review' : 'Approve Review'}
                              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                                review.status === 'approved'
                                  ? 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-500'
                                  : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600'
                              }`}
                            >
                              {review.status === 'approved' ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleReviewDelete(review.id)}
                              title="Delete permanently"
                              className="p-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl transition-all cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400 font-bold">
                        No product reviews found in database.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      

      {/* ================================== MODAL: PRODUCT MUTATE FORM ================================== */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setProductModalOpen(false)}></div>
          
          <div className="relative bg-white border border-slate-100 max-w-3xl w-full rounded-[35px] p-6 sm:p-8 shadow-2xl z-50 overflow-y-auto max-h-[90vh] animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {selectedProduct ? 'Modify Active Specimen' : 'Add New Plant Specimen'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleProductSubmit} className="space-y-4 text-left text-sm text-slate-600 font-semibold">
              
              <div className="grid grid-cols-2 gap-4">
                
                {/* Name */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Specimen Title</label>
                  <input
                    type="text"
                    required
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                  />
                </div>

                {/* Category Selection */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Category Classification</label>
                  <select
                    value={productForm.category_id}
                    onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-bold"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Main Price */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Main Price (MRP) *</label>
                  <input
                    type="number"
                    step="1"
                    required
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                  />
                </div>

                {/* Selling Price */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Selling Price (Discounted)</label>
                  <input
                    type="number"
                    step="1"
                    value={productForm.selling_price || ''}
                    onChange={(e) => setProductForm({ ...productForm, selling_price: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                    placeholder="Optional"
                  />
                </div>

                {/* Stock */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Available Stock units</label>
                  <input
                    type="number"
                    required
                    value={productForm.stock}
                    onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                  />
                </div>

                {/* Image URL & Upload */}
                <div className="space-y-1 col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Image Asset URL or Upload</label>
                  <div className="flex space-x-2">
                    <input
                      type="url"
                      required
                      value={productForm.image_url}
                      onChange={(e) => setProductForm({ ...productForm, image_url: e.target.value })}
                      placeholder="https://images.unsplash.com/photo-..."
                      className="flex-1 bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                    />
                    <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center transition-colors">
                      {uploadingImage ? 'Uploading...' : 'Choose Image'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'product')} disabled={uploadingImage} />
                    </label>
                  </div>
                </div>

                <div className="col-span-2 flex flex-wrap gap-6 pt-2">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" id="product_show_on_home" checked={productForm.show_on_home === 1} onChange={(e) => setProductForm({ ...productForm, show_on_home: e.target.checked ? 1 : 0 })} className="w-4 h-4 text-primary-600 rounded" />
                    <span className="text-sm font-bold text-slate-700">Show on Homepage Bestsellers</span>
                  </label>
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input type="checkbox" checked={productForm.is_active === 1} onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked ? 1 : 0 })} className="w-4 h-4 text-primary-600 rounded" />
                    <span className="text-sm font-bold text-slate-700">Visible in shop (active)</span>
                  </label>
                </div>

                {/* Size */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Foliage Size</label>
                  <select
                    value={productForm.size}
                    onChange={(e) => setProductForm({ ...productForm, size: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-bold"
                  >
                    <option value="Small">Small Size</option>
                    <option value="Medium">Medium Size</option>
                    <option value="Large">Large Size</option>
                  </select>
                </div>

                {/* Care Level */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Care Needed</label>
                  <select
                    value={productForm.care_level}
                    onChange={(e) => setProductForm({ ...productForm, care_level: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-bold"
                  >
                    <option value="Easy">Easy Care</option>
                    <option value="Moderate">Moderate Care</option>
                    <option value="Expert">Expert Maintenance</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1 col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Specimen Biography</label>
                  <textarea
                    rows="3"
                    value={productForm.description}
                    onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner resize-none"
                  ></textarea>
                </div>

                {/* Rating */}
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Product Rating (1-5)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={productForm.rating}
                    onChange={(e) => setProductForm({ ...productForm, rating: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                  />
                </div>

                {/* Gallery Images */}
                <div className="space-y-1 col-span-2">
                  <label className="text-xs uppercase tracking-wider text-slate-400">Gallery Images (Comma-separated URLs)</label>
                  <textarea
                    rows="2"
                    value={productForm.gallery_images}
                    onChange={(e) => setProductForm({ ...productForm, gallery_images: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-mono text-xs shadow-inner resize-none"
                    placeholder="https://img1.jpg,https://img2.jpg"
                  ></textarea>
                </div>

                {/* Visual Dimensions Section */}
                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-3">Product Dimensions & Visual Scale</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Height */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Height (cm / inches)</label>
                      <input
                        type="text"
                        value={productForm.height_cm || ''}
                        onChange={(e) => setProductForm({ ...productForm, height_cm: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium text-xs shadow-inner"
                        placeholder="e.g. 25-35 cm / 10-14 in"
                      />
                    </div>
                    {/* Pot Size */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Pot Size</label>
                      <input
                        type="text"
                        value={productForm.pot_size || ''}
                        onChange={(e) => setProductForm({ ...productForm, pot_size: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium text-xs shadow-inner"
                        placeholder="e.g. 12 cm / 5 in"
                      />
                    </div>
                    {/* Visual Scale */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Visual Scale Category</label>
                      <select
                        value={productForm.visual_scale || 'Desktop Scale'}
                        onChange={(e) => setProductForm({ ...productForm, visual_scale: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-3 py-2 outline-none font-bold text-xs"
                      >
                        <option value="Desktop Scale">Desktop Scale</option>
                        <option value="Floor Scale">Floor Scale</option>
                        <option value="Balcony Scale">Balcony Scale</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Perfect For tags */}
                <div className="col-span-2 space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-400">"Perfect For" Tags (Comma-separated)</label>
                  <input
                    type="text"
                    value={productForm.perfect_for || ''}
                    onChange={(e) => setProductForm({ ...productForm, perfect_for: e.target.value })}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                    placeholder="e.g. Office Desk, Gifting, Home Decor"
                  />
                </div>

                {/* Care Parameters Grid */}
                <div className="col-span-2 border-t border-slate-100 pt-4 mt-2">
                  <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider mb-3">Care Parameters Control</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Sun Exposure */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Sun Exposure</label>
                      <input
                        type="text"
                        value={productForm.sun_exposure || ''}
                        onChange={(e) => setProductForm({ ...productForm, sun_exposure: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium text-xs shadow-inner"
                        placeholder="e.g. Bright indirect light"
                      />
                    </div>
                    {/* Hydration */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Hydration</label>
                      <input
                        type="text"
                        value={productForm.hydration || ''}
                        onChange={(e) => setProductForm({ ...productForm, hydration: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium text-xs shadow-inner"
                        placeholder="e.g. Weekly watering"
                      />
                    </div>
                    {/* Toxin Filtration */}
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase tracking-wider text-slate-400">Toxin Filtration</label>
                      <input
                        type="text"
                        value={productForm.toxin_filtration || ''}
                        onChange={(e) => setProductForm({ ...productForm, toxin_filtration: e.target.value })}
                        className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2 outline-none font-medium text-xs shadow-inner"
                        placeholder="e.g. High purifying rating"
                      />
                    </div>
                  </div>
                </div>

                {/* Care Guide & Delivery info */}
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider text-slate-400">Care Guide Info</label>
                    <textarea
                      rows="3"
                      value={productForm.care_guide || ''}
                      onChange={(e) => setProductForm({ ...productForm, care_guide: e.target.value })}
                      className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium text-xs shadow-inner resize-none"
                      placeholder="Care instructions..."
                    ></textarea>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider text-slate-400">Delivery & Packaging Info</label>
                    <textarea
                      rows="3"
                      value={productForm.delivery_info || ''}
                      onChange={(e) => setProductForm({ ...productForm, delivery_info: e.target.value })}
                      className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium text-xs shadow-inner resize-none"
                      placeholder="Delivery & Packaging details..."
                    ></textarea>
                  </div>
                </div>

                {/* Biological Specifications Dynamic Builder */}
                <div className="space-y-2 col-span-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs uppercase tracking-wider text-slate-400">Biological Specifications</label>
                    <button
                      type="button"
                      onClick={addSpecRow}
                      className="text-[11px] font-bold text-primary-600 hover:text-primary-700 flex items-center space-x-1 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Spec Row</span>
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {(() => {
                      let rows = [];
                      try {
                        rows = JSON.parse(productForm.biological_specs || '[]');
                      } catch(e) {}
                      if (!Array.isArray(rows)) rows = [];
                      
                      if (rows.length === 0) {
                        return (
                          <p className="text-xs text-slate-400 italic py-1">No custom specifications added. Click "Add Spec Row" above to append biological fields.</p>
                        );
                      }
                      
                      return rows.map((row, idx) => (
                        <div key={idx} className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                          <input
                            type="text"
                            placeholder="Specification (e.g. Water Schedule)"
                            value={row.label || ''}
                            onChange={(e) => updateSpecRow(idx, 'label', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary-400"
                          />
                          <input
                            type="text"
                            placeholder="Value (e.g. Every 8-10 days)"
                            value={row.value || ''}
                            onChange={(e) => updateSpecRow(idx, 'value', e.target.value)}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary-400"
                          />
                          <button
                            type="button"
                            onClick={() => removeSpecRow(idx)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* Custom product detail sections (per-product tabs on storefront) */}
                <div className="space-y-3 col-span-2 border-t border-slate-100 pt-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-xs uppercase tracking-wider text-slate-400 font-extrabold">Product Page Content Sections</label>
                      <p className="text-[10px] text-slate-400 mt-0.5">Add unique tabs/content per plant — FAQ, lists, HTML, text.</p>
                    </div>
                    <button type="button" onClick={addContentSection} className="text-[11px] font-bold text-primary-600 flex items-center gap-1">
                      <Plus className="h-3.5 w-3.5" /> Add section
                    </button>
                  </div>
                  {getContentSections().length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No custom sections — default Description / Care / Shipping tabs only.</p>
                  ) : (
                    getContentSections().map((sec, idx) => (
                      <div key={sec.id || idx} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2">
                        <div className="flex gap-2">
                          <input type="text" value={sec.title || ''} onChange={(e) => updateContentSection(idx, 'title', e.target.value)} placeholder="Section title (tab name)" className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold" />
                          <select value={sec.type || 'text'} onChange={(e) => updateContentSection(idx, 'type', e.target.value)} className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-bold">
                            <option value="text">Text</option>
                            <option value="html">HTML</option>
                            <option value="list">Bullet list</option>
                            <option value="faq">FAQ</option>
                          </select>
                          <button type="button" onClick={() => removeContentSection(idx)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"><Trash2 className="h-4 w-4" /></button>
                        </div>
                        {(sec.type === 'faq') ? (
                          <textarea rows="4" value={(sec.items || []).map((it) => `${it.q || ''}|${it.a || ''}`).join('\n')} onChange={(e) => {
                            const items = e.target.value.split('\n').filter(Boolean).map((line) => {
                              const [q, ...rest] = line.split('|');
                              return { q: q?.trim(), a: rest.join('|').trim() };
                            });
                            updateContentSection(idx, 'items', items);
                          }} placeholder="Question|Answer (one per line)" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono" />
                        ) : (sec.type === 'list') ? (
                          <textarea rows="3" value={(sec.items || []).join('\n')} onChange={(e) => updateContentSection(idx, 'items', e.target.value.split('\n').filter(Boolean))} placeholder="One bullet per line" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                        ) : (
                          <textarea rows="3" value={sec.content || ''} onChange={(e) => updateContentSection(idx, 'content', e.target.value)} placeholder="Section body content" className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs" />
                        )}
                      </div>
                    ))
                  )}
                </div>

              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-grow bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-full text-xs cursor-pointer shadow-md"
                >
                  {selectedProduct ? 'Save Modifications' : 'Create Active Specimen'}
                </button>
                <button
                  type="button"
                  onClick={() => setProductModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-full text-xs"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================================== MODAL: CATEGORY FORM ================================== */}
      {categoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setCategoryModalOpen(false)}></div>
          
          <div className="relative bg-white border border-slate-100 max-w-md w-full rounded-[35px] p-6 sm:p-8 shadow-2xl z-50 animate-fade-in">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {selectedCategory ? 'Modify Category' : 'Create Category Mapping'}
              </h3>
              <button onClick={() => setCategoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCategorySubmit} className="space-y-4 text-left text-sm text-slate-600 font-semibold">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                />
              </div>

              {/* Image URL & Upload */}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400">Category Cover Image URL or Upload</label>
                <div className="flex space-x-2">
                  <input
                    type="url"
                    required
                    value={categoryForm.image_url}
                    onChange={(e) => setCategoryForm({ ...categoryForm, image_url: e.target.value })}
                    className="flex-1 bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                  />
                  <label className="cursor-pointer bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center transition-colors">
                    {uploadingImage ? 'Uploading...' : 'Choose Image'}
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'category')} disabled={uploadingImage} />
                  </label>
                </div>
              </div>

              {/* Show on Home */}
              <div className="space-y-1 flex items-center space-x-3 pt-2 pb-1">
                <input
                  type="checkbox"
                  id="cat_show_on_home"
                  checked={categoryForm.show_on_home === 1}
                  onChange={(e) => setCategoryForm({ ...categoryForm, show_on_home: e.target.checked ? 1 : 0 })}
                  className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500 cursor-pointer"
                />
                <label htmlFor="cat_show_on_home" className="text-sm font-bold text-slate-700 cursor-pointer">
                  Display mapping in "Shop by Plant Category" Homepage section
                </label>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400">Category Description</label>
                <textarea
                  rows="3"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner resize-none"
                ></textarea>
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-grow bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-full text-xs cursor-pointer shadow-md"
                >
                  {selectedCategory ? 'Save Modifications' : 'Create Category Mapping'}
                </button>
                <button
                  type="button"
                  onClick={() => setCategoryModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-full text-xs"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ================================== MODAL: ORDER INSPECTION REPORT ================================== */}
      {activeOrderDetails && (() => {
        const inspPay = getPaymentMethod(activeOrderDetails);
        const inspTags = getOrderSmartTags(activeOrderDetails, orders, customerOrderCounts);
        return (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setActiveOrderDetails(null)}></div>
          
          <div className="relative bg-white border border-slate-100 max-w-2xl w-full rounded-[35px] p-6 sm:p-8 shadow-2xl z-50 overflow-y-auto max-h-[90vh] animate-fade-in">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4 mb-6 gap-4">
              <div>
                <p className="text-[10px] font-bold text-primary-600 uppercase tracking-widest mb-1">Inspection Report</p>
                <h3 className="font-extrabold text-slate-900 text-xl">{formatOrderNumber(activeOrderDetails.id)}</h3>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {inspTags.map((t) => (
                    <span key={t.key} className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${t.className}`}>{t.label}</span>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {activeOrderDetails.status === 'delivered' && (
                  <button onClick={() => generateInvoice(activeOrderDetails, siteSettings)} className="inline-flex items-center gap-1 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 px-3 py-1.5 rounded-lg">
                    <DownloadCloud className="h-4 w-4" />
                    Invoice
                  </button>
                )}
                <button onClick={() => setActiveOrderDetails(null)} className="text-slate-400 hover:text-slate-600 p-1">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="space-y-5 text-left text-sm text-slate-600 font-semibold">
              
              {/* Customer address */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary-600" />
                  Customer Address
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div><span className="text-slate-400">Name</span><p className="font-bold text-slate-900">{activeOrderDetails.name}</p></div>
                  <div><span className="text-slate-400">Phone</span><p className="font-bold text-slate-900">{activeOrderDetails.phone}</p></div>
                  <div className="sm:col-span-2"><span className="text-slate-400">Email</span><p className="font-bold text-slate-900">{activeOrderDetails.email}</p></div>
                  <div className="sm:col-span-2"><span className="text-slate-400">Full address</span><p className="font-bold text-slate-900 leading-relaxed">{activeOrderDetails.address}, {activeOrderDetails.city} — {activeOrderDetails.zip}</p></div>
                  <div><span className="text-slate-400">Ordered</span><p className="font-bold text-slate-900">{new Date(activeOrderDetails.created_at).toLocaleString('en-IN')}</p></div>
                  <div><span className="text-slate-400">Order status</span><p className="font-bold uppercase text-slate-900">{activeOrderDetails.status}</p></div>
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  {inspPay === 'cod' ? <Banknote className="h-4 w-4 text-amber-600" /> : <CreditCard className="h-4 w-4 text-blue-600" />}
                  Payment Method
                </h4>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase ${inspPay === 'cod' ? 'bg-amber-100 text-amber-900 border border-amber-200' : 'bg-blue-100 text-blue-900 border border-blue-200'}`}>
                    {inspPay === 'cod' ? 'Cash on Delivery (COD)' : 'Online — Razorpay'}
                  </span>
                  <span className="text-lg font-black text-primary-700">₹{parseFloat(activeOrderDetails.total_amount).toLocaleString('en-IN')}</span>
                </div>
                {inspPay === 'online' && (
                  <div className="grid gap-2 text-[10px] font-mono">
                    <div className="bg-white px-2 py-1 rounded border">Order: {activeOrderDetails.razorpay_order_id || '—'}</div>
                    <div className="bg-white px-2 py-1 rounded border">Payment: {activeOrderDetails.razorpay_payment_id || 'Pending'}</div>
                  </div>
                )}
              </div>

              {/* Product list */}
              <div className="border border-slate-100 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary-600" />
                  Product List
                </h4>
                <div className="divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {activeOrderDetails.items?.map((item) => (
                    <div key={item.id} className="py-3 flex justify-between items-center gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={item.image_url} alt={item.name} className="h-10 w-10 rounded-xl object-cover border shrink-0" />
                        <div>
                          <p className="font-bold text-slate-900 truncate">{item.name}</p>
                          <p className="text-[10px] text-slate-400">Size: {item.size} · Qty: {item.quantity}</p>
                        </div>
                      </div>
                      <span className="font-black text-slate-900 shrink-0">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery tracking */}
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 space-y-3">
                <h4 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                  <Truck className="h-4 w-4 text-indigo-600" />
                  Delivery Tracking
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tracking number</label>
                    <input
                      type="text"
                      value={trackingForm.tracking_number}
                      onChange={(e) => setTrackingForm({ ...trackingForm, tracking_number: e.target.value })}
                      placeholder="e.g. AWB123456789"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Carrier</label>
                    <input
                      type="text"
                      value={trackingForm.tracking_carrier}
                      onChange={(e) => setTrackingForm({ ...trackingForm, tracking_carrier: e.target.value })}
                      placeholder="Delhivery, BlueDart..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Tracking status</label>
                    <select
                      value={trackingForm.tracking_status}
                      onChange={(e) => setTrackingForm({ ...trackingForm, tracking_status: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-indigo-500"
                    >
                      <option value="">— Select —</option>
                      <option value="Processing">Processing</option>
                      <option value="Packed">Packed</option>
                      <option value="In transit">In transit</option>
                      <option value="Out for delivery">Out for delivery</option>
                      <option value="Delivered">Delivered</option>
                    </select>
                  </div>
                </div>
                {activeOrderDetails.tracking_updated_at && (
                  <p className="text-[10px] text-slate-500">Last updated: {new Date(activeOrderDetails.tracking_updated_at).toLocaleString('en-IN')}</p>
                )}
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSaveTracking}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-5 rounded-full disabled:opacity-50"
                >
                  Save tracking details
                </button>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                <span className="font-black text-slate-900">Grand Total</span>
                <span className="text-xl font-black text-primary-700">₹{activeOrderDetails.total_amount}</span>
              </div>

              <div className="flex justify-end gap-2">
                <button onClick={() => setActiveOrderDetails(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-6 rounded-full text-xs">
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* ================================== MODAL: ADD/EDIT MEGA MENU LINK ================================== */}
      {megaMenuModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMegaMenuModalOpen(false)}></div>
          
          <div className="relative bg-white border border-slate-100 max-w-md w-full rounded-[35px] p-6 sm:p-8 shadow-2xl z-50 animate-fade-in animate-duration-300">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {selectedMegaLink ? 'Edit Mega Menu Link Node' : 'Add New Mega Menu Link Node'}
              </h3>
              <button onClick={() => setMegaMenuModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleMegaMenuSubmit} className="space-y-4 text-left text-sm text-slate-600 font-semibold font-sans">
              
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400">Link Title / Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rare Succulents"
                  value={megaMenuForm.title}
                  onChange={(e) => setMegaMenuForm({ ...megaMenuForm, title: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                />
              </div>

              {/* URL */}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400">Target Path / Routing URL</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. /shop"
                  value={megaMenuForm.url}
                  onChange={(e) => setMegaMenuForm({ ...megaMenuForm, url: e.target.value })}
                  className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                />
              </div>

              {/* Category Group */}
              <div className="space-y-1">
                <label className="text-xs uppercase tracking-wider text-slate-400">Column Category Group</label>
                {!customGroupOpen ? (
                  <select
                    value={megaMenuForm.category_group}
                    onChange={(e) => {
                      if (e.target.value === '__custom__') {
                        setCustomGroupOpen(true);
                        setMegaMenuForm({ ...megaMenuForm, category_group: '' });
                      } else {
                        setMegaMenuForm({ ...megaMenuForm, category_group: e.target.value });
                      }
                    }}
                    className="w-full bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-bold cursor-pointer"
                  >
                    {Array.from(new Set(megaMenuLinks.map(link => link.category_group))).map(grp => (
                      <option key={grp} value={grp}>{grp}</option>
                    ))}
                    {Array.from(new Set(megaMenuLinks.map(link => link.category_group))).length === 0 && (
                      <>
                        <option value="Shop by Category">Shop by Category</option>
                        <option value="Curated Collections">Curated Collections</option>
                        <option value="Care & Lifestyle">Care & Lifestyle</option>
                      </>
                    )}
                    <option value="__custom__">➕ Create Custom Category Column...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      placeholder="e.g. Seasonal Plants"
                      value={megaMenuForm.category_group}
                      onChange={(e) => setMegaMenuForm({ ...megaMenuForm, category_group: e.target.value })}
                      className="flex-grow bg-slate-50 border border-transparent focus:border-primary-500 rounded-xl px-4 py-2.5 outline-none font-medium shadow-inner"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomGroupOpen(false);
                        const groups = Array.from(new Set(megaMenuLinks.map(link => link.category_group)));
                        setMegaMenuForm({ ...megaMenuForm, category_group: groups[0] || 'Shop by Category' });
                      }}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 rounded-xl text-xs"
                    >
                      Choose Existing
                    </button>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex gap-3">
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-grow bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 rounded-full text-xs cursor-pointer shadow-md"
                >
                  {actionLoading ? 'Saving Link Node...' : (selectedMegaLink ? 'Save Modifications' : 'Register Mega Link')}
                </button>
                <button
                  type="button"
                  onClick={() => setMegaMenuModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 px-6 rounded-full text-xs"
                >
                  Cancel
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
    </div>
  );
};

export default AdminDashboard;
