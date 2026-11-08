import { useState } from 'react';
import { login, register } from '../services/userService';

/**
 * AuthPage - Componente de Autenticación para Apuestax
 * 
 * Implementa un diseño Dark Mode de alta gama con un panel deslizante (Sliding Overlay)
 * que alterna suavemente entre el formulario de Inicio de Sesión y el de Registro.
 */
function AuthPage({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);

  // Estados de formularios
  const [loginData, setLoginData] = useState({ correo: '', contraseña: '' });

  const [registerData, setRegisterData] = useState({
    nombre: '',
    apellido: '',
    cedula: '',
    nombre_rol: 'Usuario',
    correo: '',
    contraseña: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginChange = (e) => {
    const { name, value } = e.target;
    setLoginData((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegisterChange = (e) => {
    const { name, value } = e.target;
    setRegisterData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const user = await login(loginData);
      onLoginSuccess(user);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo iniciar sesión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      await register(registerData);
      setMessage('Usuario registrado correctamente. Ya puedes iniciar sesión.');
      setLoginData({ correo: registerData.correo, contraseña: '' });
      setIsLogin(true);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo registrar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 font-sans antialiased selection:bg-[#39FF14] selection:text-slate-950">
      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-6 sm:mb-8">
        <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center shadow-md">
          <span className="text-[#39FF14] font-black text-xl tracking-tighter">A</span>
        </div>
        <span className="text-2xl font-extrabold tracking-wider text-white">
          APUESTA<span className="text-[#39FF14]">X</span>
        </span>
      </div>

      {/* Contenedor Principal de Autenticación */}
      <div className="relative w-full max-w-5xl h-[720px] sm:h-[680px] bg-slate-900 rounded-3xl border border-slate-800/80 shadow-2xl shadow-black/80 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* 1. FORMULARIO DE LOGIN (Lado Izquierdo) */}
        {/* ========================================================================= */}
        <div className="absolute top-0 left-0 w-full md:w-1/2 h-full flex flex-col justify-center items-center px-6 sm:px-12 py-8 z-10">
          <div className="w-full max-w-sm">
            {/* Header del Login */}
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Iniciar Sesión
              </h2>
              <p className="text-slate-400 text-sm mt-1">
                Ingresa a tu cuenta para continuar
              </p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="correo"
                    required
                    value={loginData.correo}
                    onChange={handleLoginChange}
                    placeholder="ejemplo@apuestax.com"
                    className="w-full px-4 py-2.5 bg-slate-800 text-white placeholder-slate-500 text-sm rounded-xl border border-slate-700 focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] outline-none transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-slate-300">
                    Contraseña
                  </label>
                  <a href="#recuperar" className="text-xs text-[#39FF14] hover:underline">
                    ¿Olvidaste tu contraseña?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    name="contraseña"
                    required
                    value={loginData.contraseña}
                    onChange={handleLoginChange}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-slate-800 text-white placeholder-slate-500 text-sm rounded-xl border border-slate-700 focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] outline-none transition-all duration-200"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#39FF14] text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#39FF14]/20 cursor-pointer"
                >
                  {loading ? 'Validando...' : 'Ingresar'}
                </button>
              </div>
            </form>

            {/* Alternativa móvil para cambiar a registro */}
            <div className="md:hidden mt-6 text-center text-xs text-slate-400">
              ¿No tienes una cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                className="text-[#39FF14] font-semibold underline ml-1 cursor-pointer"
              >
                Regístrate aquí
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 2. FORMULARIO DE REGISTRO (Lado Derecho) */}
        {/* ========================================================================= */}
        <div className="absolute top-0 right-0 w-full md:w-1/2 h-full flex flex-col justify-center items-center px-6 sm:px-10 py-6 z-10 overflow-y-auto">
          <div className="w-full max-w-md">
            {/* Header del Registro */}
            <div className="text-center mb-5">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Crear Cuenta
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Completa tus datos personales para registrarte
              </p>
            </div>

            {/* Formulario en Grid de 2 Columnas */}
            <form onSubmit={handleRegisterSubmit} className="grid grid-cols-2 gap-3 text-left">
              {/* 1. Nombre */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Nombre
                </label>
                <input
                  type="text"
                  name="nombre"
                  required
                  placeholder="Nombre"
                  value={registerData.nombre}
                  onChange={handleRegisterChange}
                  className="w-full px-3 py-2 bg-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] outline-none transition-all"
                />
              </div>

              {/* 2. Apellido */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Apellido
                </label>
                <input
                  type="text"
                  name="apellido"
                  required
                  placeholder="Apellido"
                  value={registerData.apellido}
                  onChange={handleRegisterChange}
                  className="w-full px-3 py-2 bg-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] outline-none transition-all"
                />
              </div>

              {/* 3. Correo */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  name="correo"
                  required
                  placeholder="correo@ejemplo.com"
                  value={registerData.correo}
                  onChange={handleRegisterChange}
                  className="w-full px-3 py-2 bg-slate-800 text-white text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] outline-none transition-all cursor-pointer"
                />
              </div>

              {/* 4. Número documento */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Número documento
                </label>
                <input
                  type="text"
                  name="cedula"
                  required
                  placeholder="1000000000"
                  value={registerData.cedula}
                  onChange={handleRegisterChange}
                  className="w-full px-3 py-2 bg-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] outline-none transition-all"
                />
              </div>

              {/* 5. Contraseña */}
              <div className="col-span-2">
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Contraseña
                </label>
                <input
                  type="password"
                  name="contraseña"
                  required
                  placeholder="••••••••"
                  value={registerData.contraseña}
                  onChange={handleRegisterChange}
                  className="w-full px-3 py-2 bg-slate-800 text-white placeholder-slate-500 text-xs sm:text-sm rounded-xl border border-slate-700 focus:border-[#39FF14] focus:ring-1 focus:ring-[#39FF14] outline-none transition-all [color-scheme:dark]"
                />
              </div>

              {/* Botón Registrar (Ocupa las 2 columnas) */}
              <div className="col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#39FF14] text-slate-950 font-bold rounded-xl text-sm transition-all duration-200 hover:brightness-110 active:scale-[0.98] shadow-lg shadow-[#39FF14]/20 cursor-pointer"
                >
                  {loading ? 'Registrando...' : 'Registrar'}
                </button>
              </div>
            </form>

            {message && <p className="mt-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm">{message}</p>}
            {error && <p className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm">{error}</p>}

            {/* Alternativa móvil para cambiar a login */}
            <div className="md:hidden mt-4 text-center text-xs text-slate-400">
              ¿Ya tienes cuenta?{' '}
              <button
                type="button"
                onClick={() => setIsLogin(true)}
                className="text-[#39FF14] font-semibold underline ml-1 cursor-pointer"
              >
                Inicia sesión aquí
              </button>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. PANEL DESLIZANTE / COMPUERTA (Sliding Overlay) */}
        {/* ========================================================================= */}
        <div
          className={`hidden md:flex absolute top-0 left-0 w-1/2 h-full z-20 transition-transform duration-700 ease-in-out ${
            isLogin ? 'translate-x-full' : 'translate-x-0'
          }`}
        >
          <div className="w-full h-full bg-slate-800 border-x border-slate-700/60 shadow-2xl flex flex-col justify-center items-center p-10 lg:p-14 text-center relative overflow-hidden">
            
            {/* Decoración de fondo con resplandor neón */}
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-[#39FF14]/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute -bottom-24 -left-24 w-60 h-60 bg-[#39FF14]/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Contenido Condicional del Panel */}
            <div className="relative z-10 max-w-sm flex flex-col items-center">
              
              {isLogin ? (
                /* Cuando está en Login: Panel cubre Registro */
                <div className="animate-fadeIn space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center mx-auto text-[#39FF14] shadow-lg shadow-black/40">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  
                  <h2 className="text-3xl font-extrabold text-white tracking-tight">
                    ¿Nuevo por aquí?
                  </h2>
                  
                  <p className="text-slate-300 text-sm leading-relaxed">
                    Regístrate con tus datos personales para acceder a la plataforma líder de pronósticos deportivos y cuotas exclusivas.
                  </p>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setIsLogin(false)}
                      className="px-8 py-3 rounded-xl font-bold text-sm text-[#39FF14] border-2 border-[#39FF14] hover:bg-[#39FF14] hover:text-slate-950 transition-all duration-300 hover:shadow-lg hover:shadow-[#39FF14]/25 active:scale-95 cursor-pointer"
                    >
                      Registrarse
                    </button>
                  </div>
                </div>
              ) : (
                /* Cuando está en Registro: Panel cubre Login */
                <div className="animate-fadeIn space-y-5">
                  <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-700/80 flex items-center justify-center mx-auto text-[#39FF14] shadow-lg shadow-black/40">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </div>

                  <h2 className="text-3xl font-extrabold text-white tracking-tight">
                    ¡Bienvenido de nuevo!
                  </h2>

                  <p className="text-slate-300 text-sm leading-relaxed">
                    Para mantenerte conectado con nosotros, por favor inicia sesión con tu correo electrónico y contraseña.
                  </p>

                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setIsLogin(true)}
                      className="px-8 py-3 rounded-xl font-bold text-sm text-[#39FF14] border-2 border-[#39FF14] hover:bg-[#39FF14] hover:text-slate-950 transition-all duration-300 hover:shadow-lg hover:shadow-[#39FF14]/25 active:scale-95 cursor-pointer"
                    >
                      Iniciar Sesión
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

      </div>

      {/* Footer info */}
      <div className="mt-8 text-center text-xs text-slate-500">
        ApuestaX © 2026
      </div>
    </div>
  );
}

export default AuthPage;
