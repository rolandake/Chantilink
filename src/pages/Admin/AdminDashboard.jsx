import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers, FaUserShield, FaCrown, FaBan, FaCheckCircle, 
  FaSearch, FaEdit, FaTrash, FaUserPlus, FaSignInAlt, FaSyncAlt,
  FaBell, FaTimes, FaPaperPlane
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

// ============================================
// COMPOSANT TOAST
// ============================================
const Toast = ({ message, type = 'info', onClose }) => {
  const colors = { 
    info: 'bg-blue-500 text-white', 
    success: 'bg-green-500 text-white', 
    error: 'bg-red-500 text-white' 
  };

  useEffect(() => { 
    const timer = setTimeout(onClose, 3000); 
    return () => clearTimeout(timer); 
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg shadow-lg ${colors[type]} animate-slide-in z-50`}>
      {message}
    </div>
  );
};

// ============================================
// COMPOSANT STAT CARD
// ============================================
const StatCard = ({ icon, label, value, color }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color} hover:shadow-lg transition-shadow`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm font-medium">{label}</p>
        <p className="text-3xl font-bold mt-2 text-gray-800">{value || 0}</p>
      </div>
      <div className="text-4xl opacity-20">{icon}</div>
    </div>
  </div>
);

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, verifyAdminToken, getToken, refreshTokenForUser, activeUserId } = useAuth();

  // États principaux
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // États de filtrage et pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // États des modales
  const [confirmModal, setConfirmModal] = useState({ show: false, action: null, user: null });
  const [editModal, setEditModal] = useState({ show: false, user: null });
  const [formData, setFormData] = useState({ username: '', email: '', fullName: '' });

  const [notificationModal, setNotificationModal] = useState({
    show: false,
    sendToAll: true,
    selectedUser: null
  });
  const [notificationForm, setNotificationForm] = useState({
    title: '',
    message: ''
  });
  const [sendingNotification, setSendingNotification] = useState(false);

  const searchTimeout = useRef(null);
  
  // Fonction pour ajouter un toast
  const addToast = (message, type = 'info') => {
    setToasts(prev => [...prev, { id: Date.now(), message, type }]);
  };

  // ============================================
  // EFFET: VÉRIFICATION AUTHENTIFICATION
  // ============================================
  useEffect(() => {
    console.log("🔐 Vérification authentification admin...");
    
    if (!user) {
      console.error("❌ Pas d'utilisateur connecté");
      setIsAuthenticated(false);
      setLoading(false);
      addToast('Vous devez être connecté', 'error');
      navigate('/login');
      return;
    }

    if (!isAdmin()) {
      console.error("❌ Utilisateur non admin:", user.email, "Role:", user.role);
      setIsAuthenticated(false);
      setLoading(false);
      addToast('Accès réservé aux administrateurs', 'error');
      navigate('/');
      return;
    }

    console.log("✅ Authentification admin validée");
    setIsAuthenticated(true);
    loadAllUsers();
  }, [user, isAdmin, navigate]);

  // ============================================
  // FONCTION: CHARGEMENT DES UTILISATEURS
  // ============================================
  const loadAllUsers = async () => {
    setLoading(true);
    setIsRefreshing(true);
    
    try {
      const adminToken = await verifyAdminToken();
      
      if (!adminToken) {
        addToast('Session admin expirée', 'error');
        navigate('/login');
        return;
      }

      console.log("🔐 Appel API admin/users...");

      const axiosInstance = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
        headers: { Authorization: `Bearer ${adminToken}` },
        withCredentials: true
      });

      const res = await axiosInstance.get('/api/admin/users', {
        validateStatus: () => true
      });

      console.log('📥 Réponse admin/users:', res.status, res.data);

      if (res.status === 401 || res.status === 403) {
        console.warn('⚠️ Token invalide, tentative refresh...');
        
        const refreshed = await refreshTokenForUser(activeUserId);
        if (refreshed) {
          const newToken = await getToken(activeUserId);
          axiosInstance.defaults.headers['Authorization'] = `Bearer ${newToken}`;
          const retryRes = await axiosInstance.get('/api/admin/users');
          
          if (retryRes.status >= 400) {
            throw new Error(retryRes.data.message || 'Accès refusé');
          }
          
          setAllUsers(retryRes.data.users || []);
          addToast(`${(retryRes.data.users || []).length} utilisateurs chargés`, 'success');
        } else {
          addToast('Session expirée', 'error');
          navigate('/login');
        }
      } else if (res.status >= 400) {
        throw new Error(res.data.message || 'Erreur serveur');
      } else {
        setAllUsers(res.data.users || res.data || []);
        setError(null);
        addToast(`${(res.data.users || res.data || []).length} utilisateurs chargés`, 'success');
      }
    } catch (err) {
      console.error('❌ Erreur chargement utilisateurs:', err);
      addToast(err.message || 'Erreur serveur', 'error');
      setError(err.message);
      setAllUsers([]);
      
      if (err.message.includes('admin') || err.message.includes('Accès')) {
        setTimeout(() => navigate('/login'), 2000);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  // ============================================
  // CALCUL DES STATISTIQUES
  // ============================================
  const stats = useMemo(() => {
    const total = allUsers.length;
    const admins = allUsers.filter(u => u && u.role === 'admin').length;
    const verified = allUsers.filter(u => u && u.isVerified).length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = allUsers.filter(u => u && u.createdAt && new Date(u.createdAt) > sevenDaysAgo).length;
    
    return { 
      totalUsers: total, 
      admins, 
      verified, 
      recentUsers: recent 
    };
  }, [allUsers]);

  // ============================================
  // FILTRAGE DES UTILISATEURS
  // ============================================
  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      if (!user) return false;
      
      // Si pas de recherche, appliquer uniquement les filtres
      let matchesSearch = true;
      if (searchQuery !== '') {
        const lowerQuery = searchQuery.toLowerCase();
        matchesSearch = 
          (user.fullName && user.fullName.toLowerCase().includes(lowerQuery)) ||
          (user.email && user.email.toLowerCase().includes(lowerQuery));
      }
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'verified') matchesStatus = user.isVerified;
        if (statusFilter === 'banned') matchesStatus = user.isBanned;
      }
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

  // ============================================
  // PAGINATION
  // ============================================
  const paginatedUsers = useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage;
    return filteredUsers.slice(startIdx, startIdx + itemsPerPage);
  }, [filteredUsers, currentPage]);

  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [filteredUsers, currentPage, totalPages]);

  // ============================================
  // GESTION DU FORMULAIRE D'ÉDITION
  // ============================================
  useEffect(() => {
    if (editModal.show && editModal.user) {
      setFormData({
        username: editModal.user.fullName || (editModal.user.email ? editModal.user.email.split('@')[0] : ''),
        email: editModal.user.email || '',
        fullName: editModal.user.fullName || ''
      });
    }
  }, [editModal]);

  // ============================================
  // GESTION DES NOTIFICATIONS
  // ============================================
  const openNotificationModal = (sendToAll = true, selectedUser = null) => {
    setNotificationModal({
      show: true,
      sendToAll,
      selectedUser
    });
    setNotificationForm({
      title: '',
      message: ''
    });
  };

  const closeNotificationModal = () => {
    setNotificationModal({
      show: false,
      sendToAll: true,
      selectedUser: null
    });
    setNotificationForm({
      title: '',
      message: ''
    });
  };

  const handleSendNotification = async () => {
    if (!notificationForm.title.trim()) {
      addToast('Le titre est requis', 'error');
      return;
    }

    if (!notificationForm.message.trim()) {
      addToast('Le message est requis', 'error');
      return;
    }

    if (notificationForm.title.length > 100) {
      addToast('Le titre ne peut pas dépasser 100 caractères', 'error');
      return;
    }

    if (notificationForm.message.length > 500) {
      addToast('Le message ne peut pas dépasser 500 caractères', 'error');
      return;
    }

    setSendingNotification(true);

    try {
      const adminToken = await verifyAdminToken();
      
      if (!adminToken) {
        addToast('Session admin expirée', 'error');
        navigate('/login');
        return;
      }

      const axiosInstance = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
        headers: { Authorization: `Bearer ${adminToken}` },
        withCredentials: true
      });

      const payload = {
        title: notificationForm.title.trim(),
        message: notificationForm.message.trim(),
        sendToAll: notificationModal.sendToAll,
        userId: notificationModal.sendToAll ? undefined : notificationModal.selectedUser?._id
      };

      console.log('📤 Envoi notification:', payload);

      const res = await axiosInstance.post('/api/admin/send-notification', payload, {
        validateStatus: () => true
      });

      console.log('📥 Réponse notification:', res.status, res.data);

      if (res.status >= 400) {
        throw new Error(res.data.message || 'Erreur lors de l\'envoi');
      }

      addToast(res.data.message || 'Notification envoyée avec succès', 'success');
      closeNotificationModal();

    } catch (err) {
      console.error('❌ Erreur envoi notification:', err);
      addToast(err.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSendingNotification(false);
    }
  };

  // ============================================
  // ACTIONS UTILISATEUR
  // ============================================
  const handleAction = async (action, userId) => {
    setLoadingActionId(userId);
    
    try {
      const adminToken = await verifyAdminToken();
      
      if (!adminToken) {
        addToast('Session expirée', 'error');
        navigate('/login');
        return;
      }

      const axiosInstance = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
        headers: { Authorization: `Bearer ${adminToken}` },
        withCredentials: true
      });

      const { data } = await axiosInstance.patch(`/api/admin/users/${userId}/${action}`);
      addToast(data.message || 'Action réussie', 'success');
      await loadAllUsers();
      setConfirmModal({ show: false, action: null, user: null });
    } catch (err) { 
      addToast(err.response?.data?.message || err.message, 'error'); 
    } finally { 
      setLoadingActionId(null); 
    }
  };

  const handleDelete = async (userId) => {
    setLoadingActionId(userId);
    
    try {
      const adminToken = await verifyAdminToken();
      
      if (!adminToken) {
        addToast('Session expirée', 'error');
        navigate('/login');
        return;
      }

      const axiosInstance = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
        headers: { Authorization: `Bearer ${adminToken}` },
        withCredentials: true
      });

      const { data } = await axiosInstance.delete(`/api/admin/users/${userId}`);
      addToast(data.message || 'Utilisateur supprimé', 'success');
      await loadAllUsers();
      setConfirmModal({ show: false, action: null, user: null });
    } catch (err) { 
      addToast(err.response?.data?.message || err.message, 'error'); 
    } finally { 
      setLoadingActionId(null); 
    }
  };

  const handleEdit = async (userId, updates) => {
    if (!updates.email) {
      addToast('Email requis', 'error');
      return;
    }
    
    setLoadingActionId(userId);
    
    try {
      const adminToken = await verifyAdminToken();
      
      if (!adminToken) {
        addToast('Session expirée', 'error');
        navigate('/login');
        return;
      }

      const axiosInstance = axios.create({
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
        headers: { Authorization: `Bearer ${adminToken}` },
        withCredentials: true
      });

      const { data } = await axiosInstance.patch(`/api/admin/users/${userId}/edit`, updates);
      addToast(data.message || 'Utilisateur modifié', 'success');
      await loadAllUsers();
      setEditModal({ show: false, user: null });
    } catch (err) { 
      addToast(err.response?.data?.message || err.message, 'error'); 
    } finally { 
      setLoadingActionId(null); 
    }
  };

  // ============================================
  // MODALES
  // ============================================
  const ConfirmModal = () => {
    if (!confirmModal.show) return null;
    
    const { action, user } = confirmModal;
    const actionLabels = { 
      certify: 'Certifier', 
      ban: 'Bannir', 
      promote: 'Promouvoir', 
      demote: 'Rétrograder', 
      premium: 'Premium', 
      delete: 'Supprimer' 
    };
    const colorClasses = {
      certify: 'bg-orange-500 hover:bg-orange-600',
      ban: 'bg-red-500 hover:bg-red-600',
      promote: 'bg-purple-500 hover:bg-purple-600',
      demote: 'bg-yellow-500 hover:bg-yellow-600',
      premium: 'bg-yellow-500 hover:bg-yellow-600',
      delete: 'bg-red-600 hover:bg-red-700'
    };
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">{actionLabels[action]}</h3>
          <p className="mb-6 text-gray-700">
            Êtes-vous sûr de vouloir <strong>{actionLabels[action].toLowerCase()}</strong>{' '}
            <strong className="text-orange-600">{user.fullName || user.email || 'cet utilisateur'}</strong> ?
          </p>
          <div className="flex gap-3">
            <button 
              onClick={() => setConfirmModal({ show: false, action: null, user: null })} 
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition"
            >
              Annuler
            </button>
            <button 
              onClick={() => action === 'delete' ? handleDelete(user._id) : handleAction(action, user._id)} 
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition ${colorClasses[action]}`}
            >
              Confirmer
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditModal = () => {
    if (!editModal.show) return null;
    
    const isDisabled = !formData.email;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">
            Modifier {editModal.user.fullName || editModal.user.email || 'l\'utilisateur'}
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                type="email" 
                value={formData.email} 
                onChange={e => setFormData({ ...formData, email: e.target.value })} 
                placeholder="Email" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input 
                type="text" 
                value={formData.fullName} 
                onChange={e => setFormData({ ...formData, fullName: e.target.value })} 
                placeholder="Nom complet" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button 
              onClick={() => setEditModal({ show: false, user: null })} 
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition"
            >
              Annuler
            </button>
            <button 
              onClick={() => handleEdit(editModal.user._id, formData)} 
              disabled={isDisabled || loadingActionId === editModal.user._id} 
              className={`flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium transition ${
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'
              }`}
            >
              {loadingActionId === editModal.user._id ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NotificationModal = () => {
    if (!notificationModal.show) return null;

    const titleLength = notificationForm.title.length;
    const messageLength = notificationForm.message.length;
    const isTitleValid = titleLength > 0 && titleLength <= 100;
    const isMessageValid = messageLength > 0 && messageLength <= 500;
    const isFormValid = isTitleValid && isMessageValid;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaBell className="text-orange-500 text-2xl" />
              <h3 className="text-xl font-bold">Envoyer une notification</h3>
            </div>
            <button
              onClick={closeNotificationModal}
              className="text-gray-500 hover:text-gray-700 transition"
            >
              <FaTimes size={24} />
            </button>
          </div>

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Destinataire:</strong>{' '}
              {notificationModal.sendToAll ? (
                <span className="font-semibold">Tous les utilisateurs ({allUsers.length})</span>
              ) : (
                <span className="font-semibold">
                  {notificationModal.selectedUser?.fullName || notificationModal.selectedUser?.email || 'Utilisateur'}
                </span>
              )}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Titre <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={notificationForm.title}
                onChange={e => setNotificationForm({ ...notificationForm, title: e.target.value })}
                placeholder="Ex: Maintenance prévue"
                maxLength={100}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                  titleLength > 100 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'
                }`}
              />
              <p className={`text-xs mt-1 ${titleLength > 100 ? 'text-red-500' : 'text-gray-500'}`}>
                {titleLength}/100 caractères
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={notificationForm.message}
                onChange={e => setNotificationForm({ ...notificationForm, message: e.target.value })}
                placeholder="Votre message ici..."
                maxLength={500}
                rows={4}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 resize-none ${
                  messageLength > 500 ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-orange-500'
                }`}
              />
              <p className={`text-xs mt-1 ${messageLength > 500 ? 'text-red-500' : 'text-gray-500'}`}>
                {messageLength}/500 caractères
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={closeNotificationModal}
              disabled={sendingNotification}
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              onClick={handleSendNotification}
              disabled={!isFormValid || sendingNotification}
              className={`flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                !isFormValid || sendingNotification ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'
              }`}
            >
              {sendingNotification ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              ) : (
                <>
                  <FaPaperPlane />
                  Envoyer
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // RENDU: ÉCRAN D'AUTHENTIFICATION
  // ============================================
  if (!isAuthenticated && !loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <FaSignInAlt className="text-orange-500 text-6xl mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Authentification requise</h2>
          <p className="text-gray-600 mb-6">Vous devez être administrateur pour accéder à cette page</p>
          <button 
            onClick={() => navigate('/login')} 
            className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDU: TABLEAU DE BORD
  // ============================================
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* EN-TÊTE */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Tableau de bord Admin</h1>
            <p className="text-sm text-gray-500 mt-1">
              Connecté en tant que: <span className="font-semibold text-orange-600">{user?.email || 'Admin'}</span>
            </p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => openNotificationModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
            >
              <FaBell />
              Notifier tous
            </button>
            <button 
              onClick={loadAllUsers} 
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition disabled:opacity-50"
            >
              <FaSyncAlt className={isRefreshing ? 'animate-spin' : ''} />
              Rafraîchir
            </button>
          </div>
        </div>

        {/* STATISTIQUES */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FaUsers />} label="Total utilisateurs" value={stats.totalUsers} color="border-blue-500" />
          <StatCard icon={<FaUserShield />} label="Administrateurs" value={stats.admins} color="border-purple-500" />
          <StatCard icon={<FaCheckCircle />} label="Certifiés" value={stats.verified} color="border-orange-500" />
          <StatCard icon={<FaUserPlus />} label="Nouveaux (7j)" value={stats.recentUsers} color="border-green-500" />
        </div>

        {/* FILTRES */}
        <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Nom, email..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
              <select 
                value={roleFilter} 
                onChange={e => setRoleFilter(e.target.value)} 
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Tous les rôles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select 
                value={statusFilter} 
                onChange={e => setStatusFilter(e.target.value)} 
                className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">Tous les statuts</option>
                <option value="verified">Certifiés</option>
                <option value="banned">Bannis</option>
              </select>
            </div>
          </div>
        </div>

        {/* TABLEAU */}
        {loading ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
            <p className="text-gray-500 mt-4">Chargement des utilisateurs...</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Statut</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Rôle</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.length > 0 ? paginatedUsers.map(user => (
                    <tr key={user._id} className="hover:bg-gray-50 border-b border-gray-200 transition">
                      <td className="px-4 py-3 flex items-center gap-2">
                        <span className="font-medium text-gray-800">
                          {user.fullName || (user.email ? user.email.split('@')[0] : 'Utilisateur')}
                        </span>
                        {user.isVerified && <FaCheckCircle className="text-orange-500 text-sm" title="Certifié" />}
                        {user.isPremium && <FaCrown className="text-yellow-500 text-sm" title="Premium" />}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email || 'N/A'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {user.isBanned ? 'Banni' : 'Actif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-1 flex-wrap justify-center">
                        {/* Bouton notification */}
                        <button
                          onClick={() => openNotificationModal(false, user)}
                          className="p-2 rounded-lg flex items-center justify-center transition text-blue-600 hover:bg-blue-50"
                          title="Notifier cet utilisateur"
                        >
                          <FaBell />
                        </button>

                        {/* Bouton éditer */}
                        <button
                          onClick={() => setEditModal({ show: true, user })}
                          disabled={loadingActionId === user._id}
                          className="p-2 rounded-lg flex items-center justify-center transition text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                          title="Éditer"
                        >
                          {loadingActionId === user._id ? (
                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                          ) : (
                            <FaEdit />
                          )}
                        </button>

                        {/* Bouton certifier */}
                        <button
                          onClick={() => setConfirmModal({ show: true, action: 'certify', user })}
                          disabled={loadingActionId === user._id}
                          className="p-2 rounded-lg flex items-center justify-center transition text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                          title="Certifier"
                        >
                          <FaCheckCircle />
                        </button>

                        {/* Bouton premium */}
                        <button
                          onClick={() => setConfirmModal({ show: true, action: 'premium', user })}
                          disabled={loadingActionId === user._id}
                          className="p-2 rounded-lg flex items-center justify-center transition text-yellow-600 hover:bg-yellow-50 disabled:opacity-50"
                          title="Premium"
                        >
                          <FaCrown />
                        </button>

                        {/* Bouton bannir */}
                        <button
                          onClick={() => setConfirmModal({ show: true, action: 'ban', user })}
                          disabled={loadingActionId === user._id}
                          className="p-2 rounded-lg flex items-center justify-center transition text-red-600 hover:bg-red-50 disabled:opacity-50"
                          title="Bannir"
                        >
                          <FaBan />
                        </button>

                        {/* Bouton promouvoir/rétrograder */}
                        <button
                          onClick={() => setConfirmModal({ 
                            show: true, 
                            action: user.role === 'admin' ? 'demote' : 'promote', 
                            user 
                          })}
                          disabled={loadingActionId === user._id}
                          className={`p-2 rounded-lg flex items-center justify-center transition disabled:opacity-50 ${
                            user.role === 'admin' 
                              ? 'text-orange-600 hover:bg-orange-50' 
                              : 'text-purple-600 hover:bg-purple-50'
                          }`}
                          title={user.role === 'admin' ? 'Rétrograder' : 'Promouvoir'}
                        >
                          <FaUserShield />
                        </button>

                        {/* Bouton supprimer */}
                        <button
                          onClick={() => setConfirmModal({ show: true, action: 'delete', user })}
                          disabled={loadingActionId === user._id}
                          className="p-2 rounded-lg flex items-center justify-center transition text-red-800 hover:bg-red-100 disabled:opacity-50"
                          title="Supprimer"
                        >
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                        Aucun utilisateur trouvé
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button 
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} 
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Précédent
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const startPage = Math.max(1, currentPage - 2);
                return startPage + i <= totalPages ? startPage + i : null;
              }).filter(Boolean).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-medium transition ${
                    currentPage === page 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} 
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        )}

        {/* MODALES */}
        <ConfirmModal />
        <EditModal />
        <NotificationModal />

        {/* TOASTS */}
        {toasts.map(t => (
          <Toast 
            key={t.id} 
            message={t.message} 
            type={t.type} 
            onClose={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
          />
        ))}
      </div>
    </div>
  );
}