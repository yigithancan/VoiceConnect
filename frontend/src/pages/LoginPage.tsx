import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginRequest } from "../services/authApi";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      const result = await loginRequest(email, password);

      localStorage.setItem("voiceconnect_logged_in", "true");
      localStorage.setItem("voiceconnect_token", result.data.token);
      localStorage.setItem(
        "voiceconnect_user",
        JSON.stringify(result.data.user)
      );

      navigate("/dashboard");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Giriş başarısız.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-indigo-400">
          VoiceConnect
        </h1>

        <p className="mt-2 text-center text-slate-400">
          Hesabına giriş yap
        </p>

        {message && (
          <div className="mt-6 rounded-lg bg-slate-800 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        )}

        <form className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-300">
              E-posta
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="ornek@mail.com"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-300">
              Şifre
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="********"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Hesabın yok mu?{" "}
          <Link to="/register" className="text-indigo-400 hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;