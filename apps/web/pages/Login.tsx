import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Facebook, Mail } from 'lucide-react';
import { api } from '../services/api';

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            await api.login(email, password);
            navigate("/projects");
        } catch (err: any) {
            setError(err?.message || "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-blue-900 font-sans">
            {/* Background Abstract Shapes simulating the wave */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/40 rounded-full blur-[100px] transform rotate-12"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-cyan-500/30 rounded-full blur-[100px]"></div>
                <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] bg-blue-500/30 rounded-full blur-[80px]"></div>
                <div className="absolute inset-0 bg-gradient-to-br from-slate-900/80 via-blue-900/50 to-slate-900/80 mix-blend-multiply"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-soft-light"></div>
            </div>

            <div className="relative z-10 w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
                {/* Card Header with Logo */}
                <div className="pt-10 pb-2 flex flex-col items-center justify-center text-center">
                    <img src="/MerlinLogo.svg" alt="MERLIN Logo" className="w-12 h-12 mb-4" />
                    <h2 className="text-slate-500 font-medium text-sm tracking-wide">
                        Unlimited free access to our resources
                    </h2>
                </div>

                <div className="flex flex-col md:flex-row p-8 md:p-12 pt-4 gap-8 md:gap-0">
                    {/* Sign Up Column */}
                    <div className="flex-1 flex flex-col items-center px-4 md:border-r border-slate-100">
                        <h3 className="text-xl font-bold text-slate-900 mb-8">
                            Sign up
                        </h3>

                        <div className="w-full space-y-4 max-w-xs">
                            <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-full text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm bg-white">
                                <GoogleIcon />
                                Continue with Google
                            </button>
                            <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-full text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm bg-white">
                                <Facebook className="w-5 h-5 text-blue-600" />
                                Continue with Facebook
                            </button>
                            <button className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-full text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm bg-white">
                                <Mail className="w-5 h-5 text-slate-600" />
                                Sign up with email
                            </button>
                        </div>

                        <p className="text-[10px] text-slate-400 text-center mt-6 max-w-xs leading-relaxed">
                            By signing up, you agree to the{" "}
                            <a
                                href="#"
                                className="underline hover:text-slate-600"
                            >
                                Terms of Service
                            </a>{" "}
                            and acknowledge you've read our{" "}
                            <a
                                href="#"
                                className="underline hover:text-slate-600"
                            >
                                Privacy Policy
                            </a>
                            .
                        </p>
                    </div>

                    {/* Log In Column */}
                    <div className="flex-1 flex flex-col items-center px-4 mt-8 md:mt-0">
                        <h3 className="text-xl font-bold text-slate-900 mb-8">
                            Log in
                        </h3>

                        <form
                            onSubmit={handleSubmit}
                            className="w-full max-w-xs space-y-5"
                        >
                            {error && (
                              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                                {error}
                              </div>
                            )}
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1.5 ml-1">
                                    Email address
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="demo@example.com"
                                />
                            </div>

                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-1">
                                    <label className="block text-xs font-medium text-slate-500">
                                        Password
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
                                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                    >
                                        {showPassword ? (
                                            <EyeOff className="w-3 h-3" />
                                        ) : (
                                            <Eye className="w-3 h-3" />
                                        )}
                                        {showPassword ? "Hide" : "Show"}
                                    </button>
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all shadow-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <div className="flex justify-end">
                                <a
                                    href="#"
                                    className="text-xs font-medium text-slate-400 hover:text-slate-600 underline decoration-slate-300 underline-offset-2"
                                >
                                    Forget your password
                                </a>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-3 rounded-full text-white font-semibold transition-all duration-200 shadow-md bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-0.5 active:translate-y-0"
                            >
                                {isLoading ? "Logging in..." : "Log in"}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-slate-50/80 backdrop-blur-sm py-6 border-t border-slate-100">
                    <div className="flex justify-center mb-4">
                        <button className="text-xs font-medium text-slate-600 flex items-center gap-1 hover:text-slate-900 transition-colors">
                            English (United States)
                            <svg
                                className="w-3 h-3"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M19 9l-7 7-7-7"
                                ></path>
                            </svg>
                        </button>
                    </div>
                    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] text-slate-400 px-4 text-center font-medium">
                        <a
                            href="#"
                            className="hover:text-slate-600 transition-colors"
                        >
                            About
                        </a>
                        <a
                            href="#"
                            className="hover:text-slate-600 transition-colors"
                        >
                            Help Center
                        </a>
                        <a
                            href="#"
                            className="hover:text-slate-600 transition-colors"
                        >
                            Terms of Service
                        </a>
                        <a
                            href="#"
                            className="hover:text-slate-600 transition-colors"
                        >
                            Privacy Policy
                        </a>
                        <a
                            href="#"
                            className="hover:text-slate-600 transition-colors"
                        >
                            Cookie Policy
                        </a>
                        <a
                            href="#"
                            className="hover:text-slate-600 transition-colors"
                        >
                            Careers
                        </a>
                        <span>@2025 MERLIN Design</span>
                    </div>
                </div>
            </div>
        </div>
    );
};
