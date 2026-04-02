import React, { useState, useEffect } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, Mail, ArrowLeft, User, Lock, Briefcase, Building } from "lucide-react";
import { api } from "../services/api";
import Silk from "../components/ui/Silk";

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [invitationDetails, setInvitationDetails] = useState<{email: string; role: string; organizationName: string} | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validatingInvite, setValidatingInvite] = useState(false);

  useEffect(() => {
    const token = searchParams.get("token");
    const orgId = searchParams.get("org");
    
    if (token && orgId) {
      setInvitationToken(token);
      setOrganizationId(Number(orgId));
      validateInvitation(token, Number(orgId));
    }
  }, [searchParams]);

  const validateInvitation = async (token: string, orgId: number) => {
    setValidatingInvite(true);
    try {
      const response = await api.get(`/auth/invitations/validate?token=${token}&orgId=${orgId}`);
      setInvitationDetails(response);
      setEmail(response.email);
    } catch (err) {
      setError("Invalid or expired invitation");
    } finally {
      setValidatingInvite(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const payload: any = { 
        email, 
        password,
        name,
        jobTitle
      };
      
      if (invitationToken && organizationId) {
        payload.invitationToken = invitationToken;
        payload.organizationId = organizationId;
      } else if (organization) {
        payload.organizationName = organization;
      }
      
      await api.post("/auth/register", payload);
      
      const loginResponse = await api.post("/auth/login", { email, password });
      localStorage.setItem("merlin_token", loginResponse.token);
      localStorage.setItem("merlin_user", JSON.stringify(loginResponse.user));
      
      setSuccess(true);
      setTimeout(() => {
        navigate("/projects");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Registration failed");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-blue-900 font-sans">
        <Silk speed={5} scale={1} color="#4d66ff" noiseIntensity={0.8} rotation={0} />
        <div className="relative z-10 w-full max-w-md bg-white rounded-[2rem] shadow-2xl p-10 text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Account Created!</h2>
          <p className="text-slate-500 mb-8">
            Your account has been successfully created. Redirecting you to login...
          </p>
          <Link to="/" className="text-blue-600 font-semibold hover:underline">
            Go to Login now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden bg-blue-900 font-sans">
      <Silk speed={5} scale={1} color="#4d66ff" noiseIntensity={0.8} rotation={0} />

      <div className="relative z-10 w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-300">
        {/* Top Navigation */}
        <div className="p-6 md:p-8 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to login</span>
          </Link>
          <img
            src="/MerlinLogo.svg"
            alt="MERLIN Logo"
            className="w-8 h-8 md:absolute md:left-1/2 md:top-8 md:-translate-x-1/2"
          />
        </div>

        <div className="px-8 md:px-12 pb-12">
          <div className="max-w-md mx-auto">
            <div className="mb-10 text-center">
              {validatingInvite ? (
                <div className="flex items-center justify-center gap-2 py-4">
                  <div className="w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
                  <span className="text-slate-500">Validating invitation...</span>
                </div>
              ) : (
                <>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {invitationDetails ? "Accept Invitation" : "Create an account"}
                  </h1>
                  <p className="text-slate-500">
                    {invitationDetails 
                      ? `You've been invited to join ${invitationDetails.organizationName} as ${invitationDetails.role}`
                      : "Join the Merlin M&E community today"
                    }
                  </p>
                </>
              )}
            </div>

            {invitationDetails && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 text-blue-800">
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Invitation sent to {invitationDetails.email}</span>
                </div>
                <div className="mt-2 text-sm text-blue-600">
                  Role: <span className="font-semibold">{invitationDetails.role}</span>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl p-4 animate-in slide-in-from-top-1">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                    Full Name
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                    Work Email
                  </label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!!invitationDetails}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm disabled:bg-slate-100 disabled:text-slate-500"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                    Job Title
                  </label>
                  <div className="relative group">
                    <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                      placeholder="M&E Officer"
                    />
                  </div>
                </div>

                {!invitationDetails && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                      Organization
                    </label>
                    <div className="relative group">
                      <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input
                        type="text"
                        value={organization}
                        onChange={(e) => setOrganization(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                        placeholder="Global Health Org"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center mb-1 ml-1">
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] text-slate-400 hover:text-slate-600 flex items-center gap-1 font-bold tracking-tight px-2 py-0.5 rounded-lg hover:bg-slate-100 transition-all shadow-sm active:scale-95"
                  >
                    {showPassword ? (
                      <EyeOff className="w-3 h-3" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    {showPassword ? "HIDE" : "SHOW"}
                  </button>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all shadow-sm"
                    placeholder="Min. 8 characters"
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 rounded-xl text-white font-bold transition-all duration-300 shadow-xl shadow-blue-500/20 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transform hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed group flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </form>

            <p className="text-center text-xs text-slate-400 mt-8">
              By joining, you agree to our{" "}
              <a href="#" className="text-blue-500 font-semibold hover:underline">Terms</a> and{" "}
              <a href="#" className="text-blue-500 font-semibold hover:underline">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
