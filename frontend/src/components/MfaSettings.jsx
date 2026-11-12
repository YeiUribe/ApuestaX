import { useCallback, useEffect, useState } from 'react';
import {
  disableMfa,
  enableMfa,
  getMfaStatus,
  setupMfa,
} from '../services/userService';

function MfaSettings() {
  const [status, setStatus] = useState(null);
  const [setup, setSetup] = useState(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStatus = useCallback(async () => {
    try {
      setStatus(await getMfaStatus());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'MFA no está disponible.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadStatus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [loadStatus]);

  const startSetup = async () => {
    setError('');
    setFeedback('');
    try {
      setSetup(await setupMfa());
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo iniciar MFA.');
    }
  };

  const activate = async (event) => {
    event.preventDefault();
    setError('');
    setFeedback('');
    try {
      await enableMfa(code);
      setSetup(null);
      setCode('');
      setFeedback('MFA quedó habilitado correctamente.');
      await loadStatus();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'El código MFA no es válido.');
    }
  };

  const deactivate = async (event) => {
    event.preventDefault();
    setError('');
    setFeedback('');
    try {
      await disableMfa(password, code);
      setPassword('');
      setCode('');
      setFeedback('MFA quedó deshabilitado correctamente.');
      await loadStatus();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'No se pudo deshabilitar MFA.');
    }
  };

  if (loading) return <p className="text-xs text-slate-400">Consultando MFA...</p>;

  return (
    <section className="mt-6 border-t border-slate-800 pt-5">
      <h3 className="text-lg font-extrabold text-white">Autenticación de dos factores</h3>
      <p className="mt-1 text-xs text-slate-400">
        Protege tu cuenta con Microsoft Authenticator, Google Authenticator o Authy.
      </p>
      {feedback && <p className="mt-3 text-xs text-emerald-300">{feedback}</p>}
      {error && <p className="mt-3 text-xs text-red-300">{error}</p>}

      {!status?.mfa_habilitado && !setup && (
        <button
          type="button"
          onClick={startSetup}
          className="mt-4 rounded-xl bg-[#39FF14] px-4 py-2 text-xs font-bold text-slate-950"
        >
          Configurar MFA
        </button>
      )}

      {setup && (
        <form onSubmit={activate} className="mt-4 space-y-3">
          <img src={setup.qrCode} alt="Código QR para configurar MFA" className="h-44 w-44 rounded-lg bg-white p-2" />
          <p className="text-xs text-slate-400">Clave manual: <span className="break-all text-slate-200">{setup.manualKey}</span></p>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            maxLength={6}
            placeholder="Código de seis dígitos"
            className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <button type="submit" disabled={code.length !== 6} className="rounded-xl bg-[#39FF14] px-4 py-2 text-xs font-bold text-slate-950 disabled:opacity-50">
            Activar MFA
          </button>
        </form>
      )}

      {status?.mfa_habilitado && (
        <form onSubmit={deactivate} className="mt-4 space-y-3">
          <p className="text-xs text-emerald-300">MFA está habilitado.</p>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Contraseña actual"
            className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
            inputMode="numeric"
            maxLength={6}
            placeholder="Código MFA actual"
            className="w-full max-w-xs rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white"
          />
          <button type="submit" disabled={!password || code.length !== 6} className="rounded-xl border border-red-500/60 px-4 py-2 text-xs font-bold text-red-300 disabled:opacity-50">
            Deshabilitar MFA
          </button>
        </form>
      )}
    </section>
  );
}

export default MfaSettings;
