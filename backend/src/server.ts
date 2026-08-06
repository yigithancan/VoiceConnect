import app from "./app";
import { env } from "./config/env";

app.listen(env.PORT, () => {
  console.log(`Backend server http://localhost:${env.PORT} adresinde çalışıyor`);
});