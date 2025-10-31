import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Mail, Lock, User, XCircle, CheckCircle, ArrowRight, Shield } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AuthPageFuturistic() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ fullName: "", email: "", confirmEmail: "", password: "" });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const firstInputRef = useRef(null);

  useEffect(() => { firstInputRef.current?.focus(); }, [isRegister]);

  const notify = (type, message) => {
    const id = Date.now() + Math.random();
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => setNotifications(prev => prev.filter(n => n.id !== id)), 4000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setErrors(prev => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (isRegister) {
      if (!form.fullName.trim()) newErrors.fullName = "Nom requis";
      if (!emailRegex.test(form.email)) newErrors.email = "Email invalide";
      if (!emailRegex.test(form.confirmEmail)) newErrors.confirmEmail = "Email confirmation invalide";
      if (form.email !== form.confirmEmail) newErrors.confirmEmail = "Les emails ne correspondent pas";
    } else {
      if (!emailRegex.test(form.email)) newErrors.email = "Email invalide";
    }
    if (form.password.length < 6) newErrors.password = "Mot de passe trop court";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    if (loading || !validate()) return;
    setLoading(true);
    try {
      if (isRegister) {
        const [firstName, ...lastParts] = form.fullName.trim().split(" ");
        const lastName = lastParts.join(" ") || firstName;
        const result = await register({ firstName, lastName, email: form.email, password: form.password });
        if (result.success) {
          notify("success", "Compte créé !");
          setTimeout(() => navigate("/"), 1000);
        } else notify("error", result.message || "Erreur inscription");
      } else {
        const result = await login(form.email, form.password);
        if (result.success) {
          notify("success", "Connexion réussie !");
          setTimeout(() => navigate("/"), 1000);
        } else notify("error", result.message || "Identifiants incorrects");
      }
    } catch (err) {
      notify("error", err.message || "Erreur");
    } finally { setLoading(false); }
  };

  const inputClass = (field) =>
    `w-full px-4 py-3 pl-12 rounded-xl border-2 transition-all duration-300 bg-white/10 backdrop-blur-lg text-white placeholder:text-white/60 ${
      errors[field]
        ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/40"
        : "border-white/30 focus:border-orange-400 focus:ring-2 focus:ring-orange-400/40"
    }`;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-[#1a1a2e] via-[#162447] to-[#1f4068] p-4 overflow-hidden">
      
      {/* Notifications flottantes */}
      <div className="fixed top-16 right-4 flex flex-col gap-2 z-50 max-w-xs">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl text-white shadow-lg ${
                n.type==="success" ? "bg-green-500" : "bg-red-500"
              }`}
            >
              {n.type==="success" ? <CheckCircle className="w-4 h-4"/> : <XCircle className="w-4 h-4"/>}
              {n.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Card futuriste */}
      <motion.div
        className="w-full max-w-md p-8 bg-gradient-to-br from-[#162447]/50 via-[#1a1a2e]/40 to-[#1f4068]/60 rounded-3xl shadow-2xl border border-white/20 backdrop-blur-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: "spring", stiffness: 90 }}
      >
        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white/10 backdrop-blur-sm rounded-2xl p-1.5">
          <motion.button
            onClick={()=>setIsRegister(false)}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-300 ${
              !isRegister ? "bg-white/20 text-orange-400 shadow-[0_0_10px_rgba(255,165,0,0.5)]" : "text-white/70"
            }`}
          >
            Connexion
          </motion.button>
          <motion.button
            onClick={()=>setIsRegister(true)}
            className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-300 ${
              isRegister ? "bg-white/20 text-orange-400 shadow-[0_0_10px_rgba(255,165,0,0.5)]" : "text-white/70"
            }`}
          >
            Inscription
          </motion.button>
        </div>

        <form onSubmit={submit} className="space-y-5">
          {isRegister && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60"/>
              <input
                ref={firstInputRef}
                type="text"
                name="fullName"
                placeholder="Nom complet"
                value={form.fullName}
                onChange={handleChange}
                className={inputClass("fullName")}
              />
              {errors.fullName && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3"/> {errors.fullName}</p>}
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60"/>
            <input
              ref={!isRegister ? firstInputRef : null}
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              className={inputClass("email")}
            />
            {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3"/> {errors.email}</p>}
          </div>

          {isRegister && (
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60"/>
              <input
                type="email"
                name="confirmEmail"
                placeholder="Confirmer l'email"
                value={form.confirmEmail}
                onChange={handleChange}
                className={inputClass("confirmEmail")}
              />
              {errors.confirmEmail && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3"/> {errors.confirmEmail}</p>}
            </div>
          )}

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/60"/>
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Mot de passe"
              value={form.password}
              onChange={handleChange}
              className={inputClass("password")}
            />
            <button
              type="button"
              onClick={()=>setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition"
            >
              {showPassword ? <EyeOff className="w-5 h-5"/> : <Eye className="w-5 h-5"/>}
            </button>
            {errors.password && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3"/> {errors.password}</p>}
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.03, boxShadow: "0 0 20px rgba(255,165,0,0.7)" }}
            whileTap={{ scale: 0.97 }}
            className={`w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white py-4 rounded-xl font-semibold shadow-lg flex items-center justify-center gap-2 ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            {loading ? "Chargement..." : <> <span>{isRegister ? "Créer compte" : "Se connecter"}</span> <ArrowRight className="w-5 h-5"/> </>}
          </motion.button>
        </form>

        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-white/80">
          <Shield className="w-4 h-4 text-green-400"/> <span>Connexion sécurisée SSL 256-bit</span>
        </div>
      </motion.div>
    </div>
  );
}
