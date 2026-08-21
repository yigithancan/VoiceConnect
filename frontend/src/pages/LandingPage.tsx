import { Link } from "react-router-dom";

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#07070b] text-white">

      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#07070b]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-6 py-4 lg:px-10">

          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-600 text-xl font-black">
              E
            </div>

            <span className="text-2xl font-bold">
              Echora
            </span>
          </div>

          <nav className="hidden items-center gap-8 text-sm text-zinc-300 md:flex">
            <a
              href="#ozellikler"
              className="transition hover:text-orange-400"
            >
              Özellikler
            </a>

            <a
              href="#nasil-calisir"
              className="transition hover:text-orange-400"
            >
              Nasıl Çalışır?
            </a>

            <a
              href="#guvenlik"
              className="transition hover:text-orange-400"
            >
              Güvenlik
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-xl border border-zinc-700 px-4 py-2.5 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-400"
            >
              Giriş Yap
            </Link>

            <Link
              to="/register"
              className="hidden rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold transition hover:bg-orange-500 sm:block"
            >
              Ücretsiz Başla
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className="relative overflow-hidden">

          <div className="absolute left-[-150px] top-20 h-[420px] w-[420px] rounded-full bg-orange-600/10 blur-[120px]" />
          <div className="absolute right-0 top-10 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[150px]" />

          <div className="relative mx-auto grid max-w-[1500px] items-center gap-14 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:px-10 lg:py-28">

            {/* HERO SOL */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-4 py-2 text-xs font-bold text-orange-400">
                ⚡ GERÇEK ZAMANLI İLETİŞİM
              </div>

              <h1 className="max-w-2xl text-5xl font-black leading-[1.02] tracking-tight sm:text-6xl xl:text-7xl">
                Gerçek zamanlı
                <br />
                sesli, görüntülü ve
                <br />
                <span className="text-orange-500">
                  ekran paylaşımı
                </span>
                <br />
                tek yerde.
              </h1>

              <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-400">
                Echora ile arkadaşlarınla, ekibinle veya topluluğunla
                anında bağlantı kur. Sesli görüş, kameranı aç ve ekranını
                paylaş.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="rounded-xl bg-orange-600 px-7 py-4 font-bold shadow-lg shadow-orange-600/20 transition hover:-translate-y-0.5 hover:bg-orange-500"
                >
                  Ücretsiz Başla →
                </Link>

                <Link
                  to="/login"
                  className="rounded-xl border border-zinc-700 bg-zinc-900 px-7 py-4 font-bold transition hover:border-orange-500"
                >
                  Giriş Yap
                </Link>
              </div>

              <div className="mt-6 flex flex-wrap gap-5 text-xs text-zinc-500">
                <span>✓ Kurulum gerekmez</span>
                <span>✓ Tarayıcıdan çalışır</span>
                <span>✓ Anında oda oluştur</span>
              </div>
            </div>

            {/* UYGULAMA ÖNİZLEME */}
            <div className="relative">
              <div className="rounded-[28px] border border-zinc-700 bg-zinc-900 p-3 shadow-2xl shadow-violet-950/40">

                <div className="grid min-h-[520px] overflow-hidden rounded-[20px] bg-[#09090d] lg:grid-cols-[180px_1fr_200px]">

                  {/* SOL MENU */}
                  <aside className="hidden border-r border-zinc-800 bg-zinc-900 p-4 lg:block">
                    <div className="mb-5 flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-600 text-xs font-black">
                        E
                      </div>

                      <span className="font-bold">
                        Echora
                      </span>
                    </div>

                    <p className="mb-3 text-[10px] font-bold uppercase text-zinc-600">
                      Genel
                    </p>

                    {[
                      "Genel Ses Kanalı",
                      "Toplantı Odası",
                      "Proje Odası",
                      "Deneme odası",
                      "Neon Test Odası",
                    ].map((room) => (
                      <div
                        key={room}
                        className={`mb-2 rounded-lg px-3 py-2 text-xs ${
                          room === "Neon Test Odası"
                            ? "bg-orange-500/10 text-orange-300"
                            : "text-zinc-400"
                        }`}
                      >
                        🔊 {room}
                      </div>
                    ))}

                    <p className="mb-3 mt-6 text-[10px] font-bold uppercase text-zinc-600">
                      Ekip
                    </p>

                    <div className="mb-2 px-3 py-2 text-xs text-zinc-400">
                      🔊 Frontend Ekibi
                    </div>

                    <div className="px-3 py-2 text-xs text-zinc-400">
                      🔊 Backend Ekibi
                    </div>
                  </aside>

                  {/* ORTA */}
                  <section className="p-5">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-xl font-bold">
                          Neon Test Odası
                        </h3>

                        <p className="mt-1 text-xs text-zinc-500">
                          Sesli görüşme, kamera ve ekran paylaşımı.
                        </p>
                      </div>

                      <span className="rounded-lg bg-zinc-800 px-3 py-2 text-[10px]">
                        Sohbet
                      </span>
                    </div>

                    <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">
                          Bu Odadakiler
                        </span>

                        <span className="rounded-full bg-orange-500/10 px-2 py-1 text-[10px] text-orange-400">
                          2 kişi
                        </span>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <span className="rounded-lg bg-zinc-800 px-3 py-2 text-[10px]">
                          🟢 yiğithancan
                        </span>

                        <span className="rounded-lg bg-zinc-800 px-3 py-2 text-[10px]">
                          🟢 barışcan
                        </span>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 md:grid-cols-3">
                      <PreviewCard
                        text="Kamera Kapalı"
                        footer="yiğithancan"
                      />

                      <PreviewCard
                        text="Bağlantı hazır"
                        footer="barışcan"
                      />

                      <PreviewCard
                        text="Ekran paylaşımı kapalı"
                        footer="Ekran Paylaşımı"
                      />
                    </div>

                    {/* GERÇEK ECHORA BUTON STİLİ */}
                    <div className="mt-5 flex flex-wrap gap-2">
                      <button className="rounded-lg bg-green-600 px-4 py-3 text-xs font-semibold">
                        Mikrofon Aç
                      </button>

                      <button className="rounded-lg bg-green-600 px-4 py-3 text-xs font-semibold">
                        Kamera Aç
                      </button>

                      <button className="rounded-lg bg-green-600 px-4 py-3 text-xs font-semibold">
                        Ekran Paylaş
                      </button>

                      <button className="rounded-lg bg-red-600 px-4 py-3 text-xs font-semibold">
                        Medyayı Kapat
                      </button>
                    </div>

                    <div className="mt-5 border-t border-zinc-800 pt-5">
                      <button className="rounded-lg bg-orange-600 px-4 py-3 text-xs font-semibold">
                        Odadan Ayrıl
                      </button>
                    </div>
                  </section>

                  {/* KULLANICILAR */}
                  <aside className="hidden border-l border-zinc-800 bg-zinc-900 p-4 xl:block">
                    <h4 className="text-sm font-bold">
                      Kullanıcılar
                    </h4>

                    <p className="mt-1 text-[10px] text-zinc-500">
                      2 çevrimiçi
                    </p>

                    {[
                      "yiğithancan",
                      "barışcan",
                      "hakancan",
                      "Doğukancan",
                    ].map((user, index) => (
                      <div
                        key={user}
                        className="mt-3 rounded-xl border border-zinc-800 bg-zinc-800/70 p-3"
                      >
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span>
                            {index === 0 ? "👑 " : "👤 "}
                            {user}
                          </span>

                          <span
                            className={`h-2 w-2 rounded-full ${
                              index < 2
                                ? "bg-green-500"
                                : "bg-zinc-600"
                            }`}
                          />
                        </div>

                        <div className="mt-2 text-[9px] text-zinc-500">
                          {index === 0 ? "Kurucu" : "Üye"}
                        </div>
                      </div>
                    ))}
                  </aside>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ÖZELLİKLER */}
        <section
          id="ozellikler"
          className="border-y border-zinc-900 bg-zinc-950/70"
        >
          <div className="mx-auto max-w-[1500px] px-6 py-20 lg:px-10">
            <div className="mb-12 text-center">
              <p className="text-sm font-bold text-orange-500">
                ECHORA İLE NELER YAPABİLİRSİN?
              </p>

              <h2 className="mt-3 text-3xl font-black sm:text-4xl">
                İletişim için ihtiyacın olan her şey.
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-3">
              <FeatureCard
                icon="🎙️"
                title="Sesli Görüşme"
                text="Düşük gecikmeli, gerçek zamanlı sesli iletişim ile arkadaşların ve ekibinle anında konuş."
              />

              <FeatureCard
                icon="📹"
                title="Görüntülü Konuşma"
                text="Kameranı tek tıkla aç. Oda içindeki diğer kullanıcılarla görüntülü görüş."
              />

              <FeatureCard
                icon="🖥️"
                title="Ekran Paylaşımı"
                text="Ekranını paylaşarak sunum yap, proje göster veya birlikte çalış."
              />
            </div>
          </div>
        </section>

        {/* NASIL ÇALIŞIR */}
        <section
          id="nasil-calisir"
          className="mx-auto max-w-[1300px] px-6 py-24"
        >
          <div className="text-center">
            <p className="text-sm font-bold text-orange-500">
              3 ADIMDA BAŞLA
            </p>

            <h2 className="mt-3 text-4xl font-black">
              Bu kadar basit.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            <Step
              number="1"
              title="Oda oluştur"
              text="İstediğin isim ve türde kendi odanı oluştur."
            />

            <Step
              number="2"
              title="Arkadaşlarını davet et"
              text="Arkadaşların Echora hesabıyla aynı odaya katılsın."
            />

            <Step
              number="3"
              title="Bağlan"
              text="Mikrofonunu, kameranı veya ekran paylaşımını başlat."
            />
          </div>
        </section>

        {/* GÜVENLİK */}
        <section
          id="guvenlik"
          className="mx-auto mb-20 max-w-[1300px] px-6"
        >
          <div className="rounded-3xl border border-orange-500/20 bg-gradient-to-r from-orange-600/10 to-violet-600/10 p-10 text-center">
            <div className="text-4xl">
              🛡️
            </div>

            <h2 className="mt-5 text-3xl font-black">
              Odaların. Ekibin. Kontrol sende.
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-zinc-400">
              Her kullanıcı kendi odasını oluşturabilir. Oda sahibi
              katılımcıları ve oda rollerini yönetebilir.
            </p>

            <Link
              to="/register"
              className="mt-7 inline-block rounded-xl bg-orange-600 px-7 py-4 font-bold hover:bg-orange-500"
            >
              Echora'ya Katıl
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-zinc-900">
        <div className="mx-auto flex max-w-[1500px] flex-col justify-between gap-5 px-6 py-8 text-sm text-zinc-600 sm:flex-row lg:px-10">
          <span>
            © 2026 Echora
          </span>

          <span>
            Gerçek zamanlı iletişim platformu
          </span>
        </div>
      </footer>
    </div>
  );
}

function PreviewCard({
  text,
  footer,
}: {
  text: string;
  footer: string;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-zinc-800">
      <div className="flex h-36 items-center justify-center bg-zinc-700 text-[11px] text-zinc-400">
        {text}
      </div>

      <div className="px-3 py-3 text-[10px] font-bold">
        {footer}
      </div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text,
}: {
  icon: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-7 transition hover:-translate-y-1 hover:border-orange-500/50">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10 text-2xl">
        {icon}
      </div>

      <h3 className="mt-6 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 leading-7 text-zinc-400">
        {text}
      </p>
    </div>
  );
}

function Step({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-7">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-600 font-black">
        {number}
      </div>

      <h3 className="mt-6 text-xl font-bold">
        {title}
      </h3>

      <p className="mt-3 text-zinc-400">
        {text}
      </p>
    </div>
  );
}

export default LandingPage;