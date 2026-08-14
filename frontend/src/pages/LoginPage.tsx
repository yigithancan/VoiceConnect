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
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
        <h1 className="text-center text-3xl font-bold text-orange-400">
          Echora
        </h1>

        <p className="mt-2 text-center text-zinc-400">
          Hesabına giriş yap
        </p>

        {message && (
          <div className="mt-6 rounded-lg bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
            {message}
          </div>
        )}

        <form className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-300">
              E-posta
            </label>

            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="ornek@mail.com"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-300">
              Şifre
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="********"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full rounded-lg bg-orange-600 py-3 font-semibold hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Hesabın yok mu?{" "}
          <Link to="/register" className="text-orange-400 hover:underline">
            Kayıt ol
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;