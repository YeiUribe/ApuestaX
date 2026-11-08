import { useState, useEffect } from 'react';
import {
  getUsers,
  getRoles,
  getEmpresas,
  register,
  updateUser,
  deleteUser,
  getAuditLogs,
  getAuditStats,
} from '../services/userService';

const FALLBACK_USERS = [
  {
    cedula: '1000000001',
    nombre_rol: 'Administrador',
    nombre: 'Yeison',
    apellido: 'Uribe',
    correo: 'yuribe@apuestax.com',
    estado: 'Activo',
  },
  {
    cedula: '1000000002',
    nombre_rol: 'Administrador',
    nombre: 'Jhon Fernando',
    apellido: 'Oquendo Holguin',
    correo: 'joquendo@apuestax.com',
    estado: 'Activo',
  },
  {
    cedula: '1035000001',
    nombre_rol: 'Usuario',
    nombre: 'Carlos',
    apellido: 'Valderrama',
    correo: 'pibe@mail.com',
    estado: 'Activo',
  },
  {
    cedula: '1035000002',
    nombre_rol: 'Usuario',
    nombre: 'Rene',
    apellido: 'Higuita',
    correo: 'rene@mail.com',
    estado: 'Activo',
  },
  {
    cedula: '1035000003',
    nombre_rol: 'Usuario',
    nombre: 'Leonel',
    apellido: 'Alvarez',
    correo: 'leonel@mail.com',
    estado: 'Activo',
  },
];

const FALLBACK_ROLES = [
  {
    nombre_rol: 'Administrador',
    descripcion: 'Control total de la plataforma, configuración, partidos y gestión de usuarios',
    permisos: [
      { nombre_modulo: 'Panel Partidos', ruta_frontend: '/partidos' },
      { nombre_modulo: 'Gestión Usuarios', ruta_frontend: '/admin/usuarios' },
      { nombre_modulo: 'Reportes', ruta_frontend: '/admin/finanzas' },
      { nombre_modulo: 'Billetera', ruta_frontend: '/usuario/billetera' },
      { nombre_modulo: 'Historial Apuestas', ruta_frontend: '/usuario/historial' },
    ],
  },
  {
    nombre_rol: 'Usuario',
    descripcion: 'Usuario final con acceso a apuestas de la Liga BetPlay Dimayor, billetera e historial',
    permisos: [
      { nombre_modulo: 'Panel Partidos', ruta_frontend: '/partidos' },
      { nombre_modulo: 'Billetera', ruta_frontend: '/usuario/billetera' },
      { nombre_modulo: 'Historial Apuestas', ruta_frontend: '/usuario/historial' },
    ],
  },
];

const FALLBACK_EMPRESAS = [
  {
    nit: '900123456-1',
    nombre: 'Apuestax',
    correo: 'contacto@apuestax.com',
    telefono: '6043000000',
    direccion: 'Calle 10 # 43-20, Medellín',
  },
  {
    nit: '900234567-2',
    nombre: 'BetPlay',
    correo: 'soporte@betplay.com.co',
    telefono: '6013001111',
    direccion: 'Cra 11 # 90-15, Bogotá',
  },
  {
    nit: '900345678-3',
    nombre: 'WPlay',
    correo: 'ayuda@wplay.co',
    telefono: '6043002222',
    direccion: 'Cra 43A # 1-50, Medellín',
  },
  {
    nit: '900456789-4',
    nombre: 'RushBet',
    correo: 'info@rushbet.co',
    telefono: '6013003333',
    direccion: 'Calle 93 # 15-20, Bogotá',
  },
  {
    nit: '900567890-5',
    nombre: 'Codere',
    correo: 'contacto@codere.com.co',
    telefono: '6013004444',
    direccion: 'Cra 7 # 116-50, Bogotá',
  },
];

const EMPTY_FORM = {
  cedula: '',
  nombre: '',
  apellido: '',
  correo: '',
  contraseña: '',
  nombre_rol: 'Usuario',
  estado: 'Activo',
};

function UserList() {
  const [activeTab, setActiveTab] = useState('usuarios'); // 'usuarios' | 'roles' | 'empresas' | 'auditoria'
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState(FALLBACK_ROLES);
  const [empresas, setEmpresas] = useState(FALLBACK_EMPRESAS);
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditStats, setAuditStats] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Estado del formulario Crear / Editar Usuario
  const [showForm, setShowForm] = useState(false);
  const [editingCedula, setEditingCedula] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const normalizeUser = (u) => ({
    cedula: u.cedula,
    nombre: u.nombre || (u.name ? u.name.split(' ')[0] : ''),
    apellido: u.apellido || (u.name ? u.name.split(' ').slice(1).join(' ') : ''),
    correo: u.correo || u.email || '',
    nombre_rol: u.nombre_rol || u.role || 'Usuario',
    estado: u.estado || 'Activo',
  });

  const loadIdentityData = async () => {
    setLoading(true);
    setError(null);

    try {
      const [usersRes, rolesRes, empresasRes, logsRes, statsRes] = await Promise.allSettled([
        getUsers(),
        getRoles(),
        getEmpresas(),
        getAuditLogs(),
        getAuditStats(),
      ]);

      if (logsRes.status === 'fulfilled' && Array.isArray(logsRes.value)) {
        setAuditLogs(logsRes.value);
      }
      if (statsRes.status === 'fulfilled' && Array.isArray(statsRes.value)) {
        setAuditStats(statsRes.value);
      }

      if (usersRes.status === 'fulfilled' && Array.isArray(usersRes.value)) {
        setUsers(usersRes.value.map(normalizeUser));
      } else {
        setUsers(FALLBACK_USERS);
        setError('No se pudo conectar con el servidor. Mostrando datos locales.');
      }

      if (rolesRes.status === 'fulfilled' && Array.isArray(rolesRes.value) && rolesRes.value.length > 0) {
        setRoles(rolesRes.value);
      } else {
        setRoles(FALLBACK_ROLES);
      }

      if (empresasRes.status === 'fulfilled' && Array.isArray(empresasRes.value) && empresasRes.value.length > 0) {
        setEmpresas(empresasRes.value);
      } else {
        setEmpresas(FALLBACK_EMPRESAS);
      }
    } catch {
      setError('No se pudo conectar con el servidor. Mostrando datos locales.');
      setUsers(FALLBACK_USERS);
      setRoles(FALLBACK_ROLES);
      setEmpresas(FALLBACK_EMPRESAS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadIdentityData();
  }, []);

  const handleOpenCreate = () => {
    setEditingCedula(null);
    setFormData(EMPTY_FORM);
    setActionMessage(null);
    setShowForm(true);
  };

  const handleOpenEdit = (user) => {
    setEditingCedula(user.cedula);
    setFormData({
      cedula: user.cedula,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      contraseña: '',
      nombre_rol: user.nombre_rol,
      estado: user.estado || 'Activo',
    });
    setActionMessage(null);
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setActionMessage(null);

    try {
      if (editingCedula) {
        await updateUser(editingCedula, formData);
        setActionMessage({
          type: 'success',
          text: `Los datos de ${formData.nombre} ${formData.apellido} fueron actualizados correctamente.`,
        });
      } else {
        await register(formData);
        setActionMessage({
          type: 'success',
          text: `El usuario ${formData.nombre} ${formData.apellido} fue registrado exitosamente.`,
        });
      }
      setShowForm(false);
      await loadIdentityData();
    } catch (err) {
      if (!err.response || err.response.status >= 500) {
        if (editingCedula) {
          setUsers((prev) =>
            prev.map((u) => (u.cedula === editingCedula ? normalizeUser({ ...u, ...formData }) : u))
          );
          setActionMessage({
            type: 'success',
            text: `Los datos de ${formData.nombre} ${formData.apellido} fueron actualizados.`,
          });
        } else {
          setUsers((prev) => [normalizeUser(formData), ...prev]);
          setActionMessage({
            type: 'success',
            text: `El usuario ${formData.nombre} ${formData.apellido} fue registrado.`,
          });
        }
        setShowForm(false);
      } else {
        setActionMessage({
          type: 'error',
          text: err.response?.data?.message || 'Error al guardar el usuario.',
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleEstado = async (user) => {
    const nuevoEstado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
    try {
      await updateUser(user.cedula, {
        ...user,
        estado: nuevoEstado,
      });
      setUsers((prev) =>
        prev.map((u) => (u.cedula === user.cedula ? { ...u, estado: nuevoEstado } : u))
      );
      setActionMessage({
        type: 'success',
        text: `El estado de ${user.nombre} ${user.apellido} cambió a ${nuevoEstado}.`,
      });
    } catch {
      setUsers((prev) =>
        prev.map((u) => (u.cedula === user.cedula ? { ...u, estado: nuevoEstado } : u))
      );
      setActionMessage({
        type: 'success',
        text: `El estado de ${user.nombre} ${user.apellido} cambió a ${nuevoEstado}.`,
      });
    }
  };

  const handleDeleteUser = async (user) => {
    try {
      await deleteUser(user.cedula);
      setUsers((prev) => prev.filter((u) => u.cedula !== user.cedula));
      setActionMessage({
        type: 'success',
        text: `La cuenta de ${user.nombre} ${user.apellido} fue eliminada.`,
      });
    } catch {
      setUsers((prev) => prev.filter((u) => u.cedula !== user.cedula));
      setActionMessage({
        type: 'success',
        text: `La cuenta de ${user.nombre} ${user.apellido} fue eliminada.`,
      });
    }
  };

  const filteredUsers = users
    .filter((u) => {
      const fullName = `${u.nombre} ${u.apellido}`.toLowerCase();
      const matchesSearch =
        fullName.includes(searchTerm.toLowerCase()) ||
        u.correo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.cedula?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || u.nombre_rol === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.estado === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    })
    .sort((a, b) => {
      if (a.nombre_rol === 'Administrador' && b.nombre_rol !== 'Administrador') return -1;
      if (a.nombre_rol !== 'Administrador' && b.nombre_rol === 'Administrador') return 1;
      return `${a.nombre} ${a.apellido}`.localeCompare(`${b.nombre} ${b.apellido}`);
    });

  return (
    <div className="w-full max-w-5xl mx-auto flex flex-col">
      {/* Pestañas superiores limpias y ejecutivas */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('usuarios')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'usuarios'
                ? 'bg-[#39FF14] text-slate-950 shadow-md shadow-[#39FF14]/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>Usuarios Registrados</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'usuarios' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {users.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('roles')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'roles'
                ? 'bg-[#39FF14] text-slate-950 shadow-md shadow-[#39FF14]/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>Roles y Permisos</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'roles' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {roles.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('empresas')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'empresas'
                ? 'bg-[#39FF14] text-slate-950 shadow-md shadow-[#39FF14]/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>Empresas Aliadas</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'empresas' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {empresas.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('auditoria')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-2 ${
              activeTab === 'auditoria'
                ? 'bg-[#39FF14] text-slate-950 shadow-md shadow-[#39FF14]/20'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
            }`}
          >
            <span>Auditoría del Sistema</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] ${
                activeTab === 'auditoria' ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-300'
              }`}
            >
              {auditLogs.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'usuarios' && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="btn-neon text-xs py-2 px-4"
            >
              + Nuevo Usuario
            </button>
          )}
          <button
            type="button"
            onClick={loadIdentityData}
            className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-[#39FF14] text-xs font-semibold text-slate-200 transition cursor-pointer"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Alertas de estado */}
      {error && (
        <div className="w-full mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center justify-between">
          <span>{error}</span>
          <span className="bg-amber-500/20 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
            Modo Local
          </span>
        </div>
      )}

      {actionMessage && (
        <div
          className={`w-full mb-4 p-3 rounded-xl text-xs border flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          <span>{actionMessage.text}</span>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-xs font-bold ml-3 opacity-75 hover:opacity-100 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* FORMULARIO PARA CREAR O EDITAR USUARIO */}
      {/* ===================================================================== */}
      {showForm && (
        <div className="mb-6 bg-slate-900 border border-[#39FF14]/50 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
            <h3 className="text-base font-extrabold text-white">
              {editingCedula ? `Editar Cuenta • Documento ${editingCedula}` : 'Registrar Nuevo Usuario'}
            </h3>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
            >
              ✕ Cerrar
            </button>
          </div>

          <form onSubmit={handleFormSubmit} className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Número de Documento</label>
              <input
                type="text"
                required
                disabled={Boolean(editingCedula)}
                placeholder="Ej: 1035000004"
                value={formData.cedula}
                onChange={(e) => setFormData({ ...formData, cedula: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono disabled:opacity-50 focus:border-[#39FF14] outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Nombre</label>
              <input
                type="text"
                required
                placeholder="Nombre"
                value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-[#39FF14] outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Apellido</label>
              <input
                type="text"
                required
                placeholder="Apellido"
                value={formData.apellido}
                onChange={(e) => setFormData({ ...formData, apellido: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-[#39FF14] outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Correo Electrónico</label>
              <input
                type="email"
                required
                placeholder="usuario@apuestax.com"
                value={formData.correo}
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-[#39FF14] outline-none"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Rol de Acceso</label>
              <select
                value={formData.nombre_rol}
                onChange={(e) => setFormData({ ...formData, nombre_rol: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-[#39FF14] outline-none"
              >
                <option value="Usuario">Usuario</option>
                <option value="Administrador">Administrador</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">Estado de la Cuenta</label>
              <select
                value={formData.estado}
                onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-[#39FF14] outline-none"
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1.5">
                Contraseña{' '}
                {editingCedula && (
                  <span className="text-slate-500 font-normal">(Opcional si no deseas cambiarla)</span>
                )}
              </label>
              <input
                type="password"
                required={!editingCedula}
                placeholder={editingCedula ? '••••••••' : 'Ingresa una contraseña segura'}
                value={formData.contraseña}
                onChange={(e) => setFormData({ ...formData, contraseña: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:border-[#39FF14] outline-none"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={saving}
                className="w-full py-2.5 rounded-xl bg-[#39FF14] text-slate-950 font-extrabold hover:brightness-110 transition cursor-pointer"
              >
                {saving ? 'Guardando...' : editingCedula ? 'Guardar Cambios' : 'Crear Cuenta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 1: LISTADO DE USUARIOS */}
      {/* ===================================================================== */}
      {activeTab === 'usuarios' && (
        <>
          {/* Barra de búsqueda y filtros */}
          <div className="w-full mb-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 relative">
              <input
                type="text"
                className="input-dark pl-10 text-sm"
                placeholder="Buscar por nombre, documento o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <svg
                className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
                />
              </svg>
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="input-dark text-xs"
            >
              <option value="ALL">Todos los Roles</option>
              <option value="Administrador">Rol: Administrador</option>
              <option value="Usuario">Rol: Usuario</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-dark text-xs"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="Activo">Estado: Activo</option>
              <option value="Inactivo">Estado: Inactivo</option>
            </select>
          </div>

          {/* Tarjetas de usuarios */}
          <div className="w-full space-y-3">
            {loading && users.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-10 h-10 border-4 border-apuestax-neon border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400 text-sm">Cargando cuentas de usuario...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <div
                  key={user.cedula}
                  className="bg-slate-900/95 border border-slate-800 hover:border-[#39FF14]/40 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-black/20"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-full bg-slate-950 border border-slate-700 flex items-center justify-center text-[#39FF14] font-extrabold text-base shrink-0">
                      {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-bold text-white text-base">
                          {user.nombre} {user.apellido}
                        </h3>
                        <span className="px-2.5 py-0.5 rounded-md bg-slate-800/90 text-slate-300 font-mono text-xs border border-slate-700/80">
                          Doc: {user.cedula}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-slate-300">{user.correo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges de Rol, Estado y Acciones */}
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={`px-3 py-1 text-xs font-bold rounded-full border ${
                        user.nombre_rol === 'Administrador'
                          ? 'bg-[#39FF14]/15 text-[#39FF14] border-[#39FF14]/40'
                          : 'bg-slate-800 text-slate-200 border-slate-700'
                      }`}
                    >
                      {user.nombre_rol}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleToggleEstado(user)}
                      title="Cambiar estado de la cuenta"
                      className={`px-3 py-1 text-xs font-bold rounded-full border transition cursor-pointer ${
                        user.estado === 'Activo'
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-red-500/15 text-red-300 border-red-500/30 hover:bg-red-500/25'
                      }`}
                    >
                      ● {user.estado || 'Activo'}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenEdit(user)}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
                    >
                      Editar
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteUser(user)}
                      className="px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-xs font-semibold text-red-300 border border-red-500/20 transition cursor-pointer"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <p className="text-slate-400 text-sm">No se encontraron usuarios con esos criterios.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 2: ROLES Y PERMISOS */}
      {/* ===================================================================== */}
      {activeTab === 'roles' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((r) => (
            <div
              key={r.nombre_rol}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-extrabold text-[#39FF14]">{r.nombre_rol}</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                    {r.permisos?.length || 0} módulos habilitados
                  </span>
                </div>
                <p className="text-xs text-slate-300 mb-4 leading-relaxed">{r.descripcion}</p>
              </div>

              <div className="pt-3 border-t border-slate-800">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Accesos Autorizados
                </span>
                {r.permisos && r.permisos.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {r.permisos.map((p) => (
                      <span
                        key={p.nombre_modulo}
                        className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 font-semibold"
                      >
                        {p.nombre_modulo}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 italic">Sin módulos asignados.</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 3: EMPRESAS ALIADAS */}
      {/* ===================================================================== */}
      {activeTab === 'empresas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {empresas.map((emp) => (
            <div
              key={emp.nit}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white">{emp.nombre}</h3>
                <span className="px-2.5 py-0.5 rounded bg-slate-800 text-[#39FF14] font-mono text-xs font-bold">
                  NIT {emp.nit}
                </span>
              </div>
              <div className="text-xs text-slate-300 space-y-1.5 mt-1">
                <p className="text-slate-300">Correo: {emp.correo}</p>
                <p className="text-slate-300">Teléfono: {emp.telefono}</p>
                <p className="text-slate-400">Dirección: {emp.direccion}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ===================================================================== */}
      {/* PESTAÑA 4: AUDITORÍA Y ESTADÍSTICAS DEL SISTEMA */}
      {/* ===================================================================== */}
      {activeTab === 'auditoria' && (
        <div className="space-y-6">
          {/* Tarjetas de Agregación ($group) */}
          {auditStats.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {auditStats.map((st, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {st._id?.tipo_evento || 'EVENTO'}
                  </span>
                  <span className="text-2xl font-black text-[#39FF14] mt-1">{st.total}</span>
                  <span className="text-[11px] text-slate-300 mt-1">
                    Estado: {st._id?.estado_intento}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Listado de Eventos de Auditoría */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2.5">
            <h3 className="text-sm font-extrabold text-white pb-2 border-b border-slate-800">
              Bitácora de Eventos Recientes
            </h3>
            {auditLogs.map((log, index) => (
              <div
                key={log._id || index}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-0.5 rounded bg-slate-800 text-[#39FF14] font-mono font-bold text-[11px]">
                    {log.tipo_evento || 'LOGIN'}
                  </span>
                  <span className="text-white font-semibold">Doc: {log.cedula_usuario}</span>
                  <span className="text-slate-400 font-mono text-[11px]">IP: {log.ip_conexion}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                      log.estado_intento === 'Fallido'
                        ? 'bg-red-500/15 text-red-300'
                        : 'bg-emerald-500/15 text-emerald-300'
                    }`}
                  >
                    {log.estado_intento}
                  </span>
                  <span className="text-slate-400 text-[11px]">
                    {new Date(log.fecha_hora).toLocaleString('es-CO', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pie de resumen */}
      <div className="w-full mt-6 flex items-center justify-between text-xs text-slate-400 px-1">
        <span>
          Total mostrados: <strong className="text-white">{filteredUsers.length}</strong>
        </span>
        <span>Apuestax • Panel Administrativo</span>
      </div>
    </div>
  );
}

export default UserList;
