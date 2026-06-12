import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ErrorModal from '../components/shared/ErrorModal';
import SuccessModal from '../components/shared/SuccessModal';
import zbLogo from '../assets/zbfinancialholdings_logo.jpg';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setIsLoading(true);
    
    try {
      const response = await login(username, password);
      setSuccessMessage(response.message || 'Login successful! Redirecting...');
      setShowSuccessModal(true);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An error occurred';
      setError(errorMessage);
      setShowErrorModal(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#f4f8f2]">
      {/* Brand panel */}
      <div className="relative w-full lg:w-[58%] overflow-hidden bg-gradient-to-br from-[#0b7a2a] via-[#10963a] to-[#7cc242] px-8 py-12 lg:px-14 lg:py-16 flex items-center">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute -left-20 top-10 h-56 w-56 rounded-full bg-white/25 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#dff4b8]/40 blur-3xl" />
          <div className="absolute left-1/3 top-1/2 h-40 w-40 -translate-y-1/2 rounded-full border border-white/30" />
        </div>

        <div className="relative z-10 max-w-2xl">
          <div className="mb-6 inline-flex items-center rounded-full border border-white/25 bg-white/10 px-4 py-1 text-xs font-semibold tracking-[0.24em] text-white/90 uppercase">
            ZB Bank Zimbabwe
          </div>
          <h1 className="max-w-xl text-4xl font-bold leading-tight text-white lg:text-6xl">
            IFRS 9 impairment management for ZB Bank.
          </h1>
          <p className="mt-5 max-w-lg text-sm leading-6 text-white/85 lg:text-base">
            Centralise staging, ECL runs, model configuration, and portfolio reporting in one secure internal platform.
          </p>
          <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Coverage</p>
              <p className="mt-2 text-lg font-semibold text-white">Retail and business lending</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Focus</p>
              <p className="mt-2 text-lg font-semibold text-white">ECL, staging and monitoring</p>
            </div>
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs uppercase tracking-[0.2em] text-white/70">Reporting</p>
              <p className="mt-2 text-lg font-semibold text-white">Branch and portfolio insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* Login panel */}
      <div className="w-full lg:w-[42%] bg-white px-6 py-10 sm:px-10 lg:px-12 flex flex-col justify-center">
        <div className="mx-auto w-full max-w-md rounded-[2rem] bg-white p-8 sm:p-10">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-white">
              <img src={zbLogo} alt="ZB Financial Holdings" className="h-14 w-14 object-contain" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[#14532d]">Welcome back</h2>
            <p className="mt-2 text-sm text-[#4b6352]">
              Sign in to access the ZB Bank IFRS 9 platform.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label 
                htmlFor="username" 
                className="mb-1 block text-sm font-medium text-[#244031]"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-sm border border-[#d7dfd3] bg-white px-4 py-3 text-[#1f2937] outline-none transition focus:border-[#10963a]"
                placeholder="Enter your username"
              />
            </div>

            <div>
              <label 
                htmlFor="password" 
                className="mb-1 block text-sm font-medium text-[#244031]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-sm border border-[#d7dfd3] bg-white px-4 py-3 text-[#1f2937] outline-none transition focus:border-[#10963a]"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#10963a] px-4 py-3 font-semibold text-white transition hover:bg-[#0b7a2a] focus:outline-none focus:ring-4 focus:ring-[#10963a]/20 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg 
                    className="animate-spin h-5 w-5 mr-3" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                      fill="none"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-[#6b7f6f]">
            Internal use only. ZB Bank credit risk and impairment workflows.
          </p>
        </div>
      </div>

      {/* Modals */}
      <ErrorModal
        isOpen={showErrorModal}
        message={error}
        onClose={() => setShowErrorModal(false)}
      />
      
      <SuccessModal
        isOpen={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
};

export default Login;
