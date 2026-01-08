import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const QUOTES_DIR = path.join(__dirname, "quotes");

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data, null, 2));
}

function listJsonFiles() {
  return fs.readdirSync(QUOTES_DIR).filter(f => f.endsWith(".json"));
}

function readJson(file) {
  const p = path.join(QUOTES_DIR, file);
  return JSON.parse(fs.readFileSync(p, "utf-8"));
}

export default async function handler(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname.replace(/\/+$/, "");

  // ROOT
  if (pathname === "" || pathname === "/") {
    return send(res, 200, {
      name: "Quotes API",
      usage: {
        root: "/",
        list: "/xyz/listquote",
        quote: "/xyz/quote?<file>=<kategori>"
      },
      example: [
        "/xyz/listquote",
        "/xyz/quote?bujin=Pengakuan%20%26%20Rasa"
      ]
    });
  }

  // LIST FILE + KATEGORI
  if (pathname === "/xyz/listquote") {
    try {
      const files = listJsonFiles();
      const result = files.map(file => {
        const data = readJson(file);
        return {
          file: file.replace(".json", ""),
          kategori: data.map(d => d.kategori)
        };
      });

      return send(res, 200, {
        total_file: result.length,
        data: result
      });
    } catch {
      return send(res, 500, { error: "Gagal membaca folder quotes" });
    }
  }

  // RANDOM QUOTE
  if (pathname === "/xyz/quote") {
    const params = [...url.searchParams.entries()];
    if (params.length !== 1) {
      return send(res, 400, {
        error: "Format salah. Gunakan ?<file>=<kategori>"
      });
    }

    const [fileKey, kategori] = params[0];
    const fileName = `${fileKey}.json`;

    try {
      const data = readJson(fileName);
      const target = data.find(d => d.kategori === kategori);

      if (!target) {
        return send(res, 404, { error: "Kategori tidak ditemukan" });
      }

      const quote = target.quotes[
        Math.floor(Math.random() * target.quotes.length)
      ];

      return send(res, 200, {
        file: fileKey,
        kategori,
        quote
      });
    } catch {
      return send(res, 404, { error: "File tidak ditemukan" });
    }
  }

  return send(res, 404, { error: "Endpoint tidak tersedia" });
}
