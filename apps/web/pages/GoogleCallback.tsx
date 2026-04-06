import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authStorage } from "../services/api";

export const GoogleCallback: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const hash = window.location.hash;
    const queryPart = hash.includes("?") ? hash.substring(hash.indexOf("?") + 1) : window.location.search.substring(1);
    const params = new URLSearchParams(queryPart);
    const token = params.get("token");

    if (!token) {
      setError("Google sign-in failed. Please try again.");
      return;
    }

    authStorage.setToken(token);
    window.history.replaceState({}, document.title, `${window.location.pathname}#/`);
    navigate("/projects");
  }, [navigate]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-blue-900 text-white">
      <div className="max-w-md w-full bg-slate-900/95 rounded-3xl p-10 text-center shadow-2xl">
        <h2 className="text-2xl font-semibold mb-4">Signing you in…</h2>
        <p className="text-sm text-slate-300">Please wait while we complete your Google login.</p>
        {error && (
          <div className="mt-6 rounded-xl bg-red-600/10 border border-red-500 p-4 text-left text-sm text-red-100">
            <p>{error}</p>
            <p className="mt-2">
              Return to <a href="/#/" className="underline text-white">login</a> and try again.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
