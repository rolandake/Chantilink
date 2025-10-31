// src/pages/admin/AdminDashboard.jsx (AVEC SYSTÈME DE NOTIFICATIONS)
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaUsers, FaUserShield, FaCrown, FaBan, FaCheckCircle, 
  FaSearch, FaEdit, FaTrash, FaUserPlus, FaSignInAlt, FaSyncAlt, FaBell
} from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';

const Toast = ({ message, type='info', onClose }) => {
  const colors = { 
    info:'bg-blue-500 text-white', 
    success:'bg-green-500 text-white', 
    error:'bg-red-500 text-white' 
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

const StatCard = ({icon, label, value, color}) => (
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

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, isAdmin, getToken } = useAuth();

  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loadingActionId, setLoadingActionId] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [confirmModal, setConfirmModal] = useState({show:false,action:null,user:null});
  const [editModal, setEditModal] = useState({show:false,user:null});
  const [formData, setFormData] = useState({username:'',email:'',fullName:''});

  // 🔔 NOUVEAU : Modal de notification
  const [notificationModal, setNotificationModal] = useState({show:false,targetUser:null});
  const [notificationForm, setNotificationForm] = useState({title:'',message:'',sendToAll:false});
  const [sendingNotification, setSendingNotification] = useState(false);

  const addToast = (message,type='info') => setToasts(prev=>[...prev,{id:Date.now(),message,type}]);

  const createAxiosInstance = async () => {
    const token = await getToken();
    
    if (!token) {
      throw new Error('Token manquant');
    }

    return axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      withCredentials: true
    });
  };

  useEffect(() => {
    console.log("🔐 Vérification authentification admin...");
    
    if (!user) {
      console.error("❌ Pas d'utilisateur connecté");
      setIsAuthenticated(false);
      setLoading(false);
      addToast('Vous devez être connecté', 'error');
      setTimeout(() => navigate('/auth'), 2000);
      return;
    }

    if (!isAdmin()) {
      console.error("❌ Utilisateur non admin:", user.email, "Role:", user.role);
      setIsAuthenticated(false);
      setLoading(false);
      addToast('Accès réservé aux administrateurs', 'error');
      setTimeout(() => navigate('/'), 2000);
      return;
    }

    console.log("✅ Authentification admin validée");
    setIsAuthenticated(true);
    loadAllUsers();
  }, [user, isAdmin, navigate]);

  const loadAllUsers = async () => {
    setLoading(true);
    setIsRefreshing(true);
    
    try {
      const axiosInstance = await createAxiosInstance();
      
      console.log("🔐 Appel API admin/users...");

      const res = await axiosInstance.get('/api/admin/users');

      console.log('📥 Réponse admin/users:', res.status, res.data);

      setAllUsers(res.data.users || res.data || []);
      setError(null);
      addToast(`${(res.data.users || res.data || []).length} utilisateurs chargés`, 'success');
      
    } catch (err) {
      console.error('❌ Erreur chargement utilisateurs:', err);
      const errorMsg = err.response?.data?.message || err.message || 'Erreur serveur';
      addToast(errorMsg, 'error');
      setError(errorMsg);
      setAllUsers([]);
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        setTimeout(() => navigate('/auth'), 2000);
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const stats = useMemo(() => {
    const total = allUsers.length;
    const admins = allUsers.filter(u => u.role === 'admin').length;
    const verified = allUsers.filter(u => u.isVerified).length;
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = allUsers.filter(u => new Date(u.createdAt) > sevenDaysAgo).length;
    return { totalUsers: total, admins, verified, recentUsers: recent };
  }, [allUsers]);

  const filteredUsers = useMemo(() => {
    return allUsers.filter(user => {
      const matchesSearch = searchQuery === '' || 
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.fullName && user.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'verified') matchesStatus = user.isVerified;
        if (statusFilter === 'banned') matchesStatus = user.isBanned;
      }
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

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

  useEffect(() => {
    if(editModal.show && editModal.user){
      setFormData({
        username: editModal.user.username,
        email: editModal.user.email,
        fullName: editModal.user.fullName || ''
      });
    }
  }, [editModal]);

  const handleAction = async (action, userId) => {
    setLoadingActionId(userId);
    try {
      const axiosInstance = await createAxiosInstance();
      const { data } = await axiosInstance.patch(`/api/admin/users/${userId}/${action}`);
      addToast(data.message || 'Action réussie','success');
      await loadAllUsers();
      setConfirmModal({show:false,action:null,user:null});
    } catch(err) { 
      addToast(err.response?.data?.message || err.message,'error'); 
    } finally { 
      setLoadingActionId(null); 
    }
  };

  const handleDelete = async (userId) => {
    setLoadingActionId(userId);
    try {
      const axiosInstance = await createAxiosInstance();
      const { data } = await axiosInstance.delete(`/api/admin/users/${userId}`);
      addToast(data.message || 'Utilisateur supprimé','success');
      await loadAllUsers();
      setConfirmModal({show:false,action:null,user:null});
    } catch(err) { 
      addToast(err.response?.data?.message || err.message,'error'); 
    } finally { 
      setLoadingActionId(null); 
    }
  };

  const handleEdit = async (userId, updates) => {
    if(!updates.username || !updates.email){
      addToast('Username et Email sont requis','error');
      return;
    }
    setLoadingActionId(userId);
    try {
      const axiosInstance = await createAxiosInstance();
      const { data } = await axiosInstance.patch(`/api/admin/users/${userId}/edit`, updates);
      addToast(data.message || 'Utilisateur modifié','success');
      await loadAllUsers();
      setEditModal({show:false,user:null});
    } catch(err) { 
      addToast(err.response?.data?.message || err.message,'error'); 
    } finally { 
      setLoadingActionId(null); 
    }
  };

  // 🔔 NOUVEAU : Envoi de notification
  const handleSendNotification = async () => {
    if (!notificationForm.title.trim() || !notificationForm.message.trim()) {
      addToast('Le titre et le message sont requis', 'error');
      return;
    }

    setSendingNotification(true);
    try {
      const axiosInstance = await createAxiosInstance();
      
      const payload = {
        title: notificationForm.title,
        message: notificationForm.message,
        sendToAll: notificationForm.sendToAll,
        userId: notificationForm.sendToAll ? null : notificationModal.targetUser?._id
      };

      const { data } = await axiosInstance.post('/api/admin/send-notification', payload);
      
      addToast(data.message || 'Notification envoyée avec succès', 'success');
      setNotificationModal({show:false, targetUser:null});
      setNotificationForm({title:'', message:'', sendToAll:false});
    } catch(err) {
      console.error('❌ Erreur envoi notification:', err);
      addToast(err.response?.data?.message || 'Erreur lors de l\'envoi', 'error');
    } finally {
      setSendingNotification(false);
    }
  };

  // 🔔 NOUVEAU : Ouvrir modal notification
  const openNotificationModal = (targetUser = null) => {
    setNotificationModal({show:true, targetUser});
    setNotificationForm({
      title:'',
      message:'',
      sendToAll: targetUser === null
    });
  };

  const ConfirmModal = () => {
    if(!confirmModal.show) return null;
    const {action,user} = confirmModal;
    const actionLabels = { certify:'Certifier', ban:'Bannir', promote:'Promouvoir', demote:'Rétrograder', premium:'Premium', delete:'Supprimer' };
    const colorClasses = {certify:'bg-orange-500 hover:bg-orange-600',ban:'bg-red-500 hover:bg-red-600',promote:'bg-purple-500 hover:bg-purple-600',demote:'bg-yellow-500 hover:bg-yellow-600',premium:'bg-yellow-500 hover:bg-yellow-600',delete:'bg-red-600 hover:bg-red-700'};
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">{actionLabels[action]}</h3>
          <p className="mb-6 text-gray-700">Êtes-vous sûr de vouloir <strong>{actionLabels[action].toLowerCase()}</strong> <strong className="text-orange-600">{user.username}</strong> ?</p>
          <div className="flex gap-3">
            <button onClick={()=>setConfirmModal({show:false,action:null,user:null})} className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition">Annuler</button>
            <button onClick={()=>action==='delete'?handleDelete(user._id):handleAction(action,user._id)} className={`flex-1 px-4 py-2 text-white rounded-lg font-medium transition ${colorClasses[action]}`}>Confirmer</button>
          </div>
        </div>
      </div>
    );
  };

  const EditModal = () => {
    if(!editModal.show) return null;
    const isDisabled = !formData.username || !formData.email;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <h3 className="text-xl font-bold mb-4">Modifier {editModal.user.username}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom d'utilisateur</label>
              <input type="text" value={formData.username} onChange={e=>setFormData({...formData,username:e.target.value})} placeholder="Nom d'utilisateur" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={e=>setFormData({...formData,email:e.target.value})} placeholder="Email" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input type="text" value={formData.fullName} onChange={e=>setFormData({...formData,fullName:e.target.value})} placeholder="Nom complet" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"/>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={()=>setEditModal({show:false,user:null})} className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition">Annuler</button>
            <button onClick={()=>handleEdit(editModal.user._id,formData)} disabled={isDisabled || loadingActionId===editModal.user._id} className={`flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium transition ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}>
              {loadingActionId===editModal.user._id ? <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mx-auto"></div> : 'Enregistrer'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 🔔 NOUVEAU : Modal de notification
  const NotificationModal = () => {
    if(!notificationModal.show) return null;
    const isDisabled = !notificationForm.title.trim() || !notificationForm.message.trim();
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
          <div className="flex items-center gap-3 mb-4">
            <FaBell className="text-orange-500 text-2xl"/>
            <h3 className="text-xl font-bold">
              {notificationForm.sendToAll ? 'Notification à tous les utilisateurs' : `Notification à ${notificationModal.targetUser?.username}`}
            </h3>
          </div>
          
          <div className="space-y-4">
            {notificationModal.targetUser === null && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                <input 
                  type="checkbox" 
                  id="sendToAll"
                  checked={notificationForm.sendToAll}
                  onChange={e=>setNotificationForm({...notificationForm,sendToAll:e.target.checked})}
                  className="w-4 h-4 text-orange-500 focus:ring-orange-500 rounded"
                />
                <label htmlFor="sendToAll" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Envoyer à tous les utilisateurs
                </label>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Titre de la notification</label>
              <input 
                type="text" 
                value={notificationForm.title} 
                onChange={e=>setNotificationForm({...notificationForm,title:e.target.value})}
                placeholder="Ex: Nouvelle mise à jour" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-1">{notificationForm.title.length}/100</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea 
                value={notificationForm.message} 
                onChange={e=>setNotificationForm({...notificationForm,message:e.target.value})}
                placeholder="Écrivez votre message ici..." 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 min-h-[120px] resize-y"
                maxLength={500}
              />
              <p className="text-xs text-gray-500 mt-1">{notificationForm.message.length}/500</p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button 
              onClick={()=>{
                setNotificationModal({show:false,targetUser:null});
                setNotificationForm({title:'',message:'',sendToAll:false});
              }} 
              className="flex-1 px-4 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition"
            >
              Annuler
            </button>
            <button 
              onClick={handleSendNotification}
              disabled={isDisabled || sendingNotification} 
              className={`flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg font-medium transition ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-600'}`}
            >
              {sendingNotification ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mx-auto"></div>
              ) : (
                'Envoyer'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  if(!isAuthenticated && !loading){
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-orange-50 to-red-50">
        <div className="text-center max-w-md bg-white rounded-2xl shadow-2xl p-8">
          <FaSignInAlt className="text-orange-500 text-6xl mx-auto mb-4"/>
          <h2 className="text-3xl font-bold text-gray-800 mb-3">Authentification requise</h2>
          <p className="text-gray-600 mb-6">Vous devez être administrateur pour accéder à cette page</p>
          <button onClick={()=>navigate('/auth')} className="px-6 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition">Se connecter</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Tableau de bord Admin</h1>
            <p className="text-sm text-gray-500 mt-1">Connecté en tant que: <span className="font-semibold text-orange-600">{user?.email}</span></p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => openNotificationModal(null)}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FaUsers />} label="Total utilisateurs" value={stats.totalUsers} color="border-blue-500"/>
          <StatCard icon={<FaUserShield />} label="Administrateurs" value={stats.admins} color="border-purple-500"/>
          <StatCard icon={<FaCheckCircle />} label="Certifiés" value={stats.verified} color="border-orange-500"/>
          <StatCard icon={<FaUserPlus />} label="Nouveaux (7j)" value={stats.recentUsers} color="border-green-500"/>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rechercher</label>
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                <input type="text" placeholder="Nom, email..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"/>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Rôle</label>
              <select value={roleFilter} onChange={e=>setRoleFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="all">Tous les rôles</option>
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
              <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500">
                <option value="all">Tous les statuts</option>
                <option value="verified">Certifiés</option>
                <option value="banned">Bannis</option>
              </select>
            </div>
          </div>
        </div>

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
                        <span className="font-medium text-gray-800">{user.username}</span>
                        {user.isVerified && <FaCheckCircle className="text-orange-500 text-sm" title="Certifié"/>} 
                        {user.isPremium && <FaCrown className="text-yellow-500 text-sm" title="Premium"/>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {user.isBanned ? 'Banni' : 'Actif'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 flex gap-1 flex-wrap justify-center">
                        {/* 🔔 NOUVEAU : Bouton notification */}
                        <button 
                          onClick={()=>openNotificationModal(user)} 
                          className="p-2 rounded-lg flex items-center justify-center transition text-blue-600 hover:bg-blue-50"
                          title="Envoyer une notification"
                        >
                          <FaBell />
                        </button>

                        {['edit','certify','premium','ban','promote','demote','delete'].map((actionKey) => {
                          let icon, color;
                          switch(actionKey){
                            case 'edit': icon=<FaEdit />; color='text-blue-600 hover:bg-blue-50'; break;
                            case 'certify': icon=<FaCheckCircle />; color='text-orange-600 hover:bg-orange-50'; break;
                            case 'premium': icon=<FaCrown />; color='text-yellow-600 hover:bg-yellow-50'; break;
                            case 'ban': icon=<FaBan />; color='text-red-600 hover:bg-red-50'; break;
                            case 'promote':
                            case 'demote': icon=<FaUserShield />; color=actionKey==='promote'?'text-purple-600 hover:bg-purple-50':'text-orange-600 hover:bg-orange-50'; break;
                            case 'delete': icon=<FaTrash />; color='text-red-800 hover:bg-red-100'; break;
                            default: icon=null;
                          }
                          const isDisabled = loadingActionId===user._id;
                          return (
                            <button key={actionKey} 
                              onClick={()=> {
                                if(actionKey==='edit') setEditModal({show:true,user});
                                else if(['promote','demote','certify','premium','ban','delete'].includes(actionKey)) setConfirmModal({show:true,action:actionKey==='promote' && user.role!=='user'?'demote':actionKey,user});
                              }}
                              className={`p-2 rounded-lg flex items-center justify-center transition ${color} ${isDisabled?'opacity-50 cursor-not-allowed':''}`}
                              disabled={isDisabled}
                              title={actionKey}
                            >
                              {loadingActionId===user._id ? <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div> : icon}
                            </button>
                          );
                        })}
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

        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={()=>setCurrentPage(prev=>Math.max(prev-1,1))} disabled={currentPage===1} className="px-3 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed">Précédent</button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const startPage = Math.max(1, currentPage - 2);
                return startPage + i <= totalPages ? startPage + i : null;
              }).filter(Boolean).map(page => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg font-medium transition ${currentPage === page ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-800 hover:bg-gray-300'}`}
                >
                  {page}
                </button>
              ))}
            </div>
            <button onClick={()=>setCurrentPage(prev=>Math.min(prev+1,totalPages))} disabled={currentPage===totalPages} className="px-3 py-2 bg-gray-300 text-gray-800 rounded-lg font-medium hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed">Suivant</button>
          </div>
        )}

        <ConfirmModal />
        <EditModal />
        <NotificationModal />

        {toasts.map(t => <Toast key={t.id} message={t.message} type={t.type} onClose={()=>setToasts(prev=>prev.filter(x=>x.id!==t.id))}/>)}
      </div>
    </div>
  );
}