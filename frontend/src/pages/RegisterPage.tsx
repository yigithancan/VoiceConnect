import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerRequest } from "../services/authApi";

function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    if (!username || !email || !password) {
      setMessage("Lütfen tüm alanları doldurun.");
      return;
    }

    try {
      setIsLoading(true);
      setMessage("");

      await registerRequest(username, email, password);

      setMessage("Kayıt başarılı. Giriş sayfasına yönlendiriliyorsun.");

      setTimeout(() => {
        navigate("/login");
      }, 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kayıt başarısız.");
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
          Yeni hesap oluştur
        </p>

        {message && (
          <div className="mt-6 rounded-lg bg-zinc-800 px-4 py-3 text-sm text-zinc-300">
            {message}
          </div>
        )}

        <form className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-zinc-300">
              Kullanıcı adı
            </label>

            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 outline-none focus:border-orange-500"
              placeholder="yigithancan"
            />
          </div>

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
            onClick={handleRegister}
            disabled={isLoading}
            className="w-full rounded-lg bg-orange-600 py-3 font-semibold hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Kaydediliyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          Zaten hesabın var mı?{" "}
          <Link to="/login" className="text-orange-400 hover:underline">
            Giriş yap
          </Link>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;