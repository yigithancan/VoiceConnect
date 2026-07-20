import app from "./app";

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Backend server http://localhost:${PORT} adresinde çalışıyor`);
});