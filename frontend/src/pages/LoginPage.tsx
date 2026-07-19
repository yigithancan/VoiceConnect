import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    if (!email || !password) {
      alert("Lütfen e-posta ve şifre alanlarını doldurun.");
      return;
    }

    const savedUser = localStorage.getItem("voiceconnect_user");

    if (!savedUser) {
      alert("Kayıtlı kullanıcı bulunamadı. Önce kayıt olun.");
      return;
    }

    const user = JSON.parse(savedUser);

    if (user.email !== email || user.password !== password) {
      alert("E-posta veya şifre hatalı.");
      return;
    }

    localStorage.setItem("voiceconnect_logged_in", "true");

    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 p-8 shadow-xl border border-slate-800">
        <h1 className="text-3xl font-bold text-center text-indigo-400">
          VoiceConnect
        </h1>

        <p className="mt-2 text-center text-slate-400">
          Hesabına giriş yap
        </p>

        <form className="mt-8 space-y-4">
          <div>
            <label className="block text-sm text-slate-300">
              E-posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 outline-none focus:border-indigo-500"
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
              className="mt-2 w-full rounded-lg bg-slate-800 border border-slate-700 px-4 py-3 outline-none focus:border-indigo-500"
              placeholder="********"
            />
          </div>

          <button
            type="button"
            onClick={handleLogin}
            className="w-full rounded-lg bg-indigo-600 py-3 font-semibold hover:bg-indigo-700"
          >
            Giriş Yap
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