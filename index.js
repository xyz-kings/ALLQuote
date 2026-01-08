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

function normalize(str = "") {
  return decodeURIComponent(str)
    .replace(/\+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function listFiles() {
  return fs.readdirSync(QUOTES_DIR).filter(f => f.endsWith(".json"));
}

function readJson(file) {
  return JSON.parse(
    fs.readFileSync(path.join(QUOTES_DIR, file), "utf-8")
  );
}

export default function handler(req, res) {
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
        "/xyz/quote?bujin=Pengakuan & Rasa",
        "/xyz/quote?anime=Motivasi & Semangat"
      ]
    });
  }

  // LIST FILE + KATEGORI
  if (pathname === "/xyz/listquote") {
    const files = listFiles();

    const data = files.map(file => {
      const json = readJson(file);
      return {
        file: file.replace(".json", ""),
        kategori: json.map(x => x.kategori)
      };
    });

    return send(res, 200, {
      total_file: data.length,
      data
    });
  }

  // RANDOM QUOTE (ANTI & ANTI ERROR)
  if (pathname === "/xyz/quote") {
    const raw = url.search.slice(1); // RAW QUERY
    const idx = raw.indexOf("=");

    if (idx === -1) {
      return send(res, 400, {
        error: "Format salah. Gunakan ?<file>=<kategori>"
      });
    }

    const fileKey = raw.slice(0, idx);
    const kategoriInput = raw.slice(idx + 1);

    const fileName = `${fileKey}.json`;
    const kategoriNormalized = normalize(kategoriInput);

    try {
      const data = readJson(fileName);

      const target = data.find(d =>
        normalize(d.kategori) === kategoriNormalized
      );

      if (!target) {
        return send(res, 404, {
          error: "Kategori tidak ditemukan",
          received: decodeURIComponent(kategoriInput)
        });
      }

      const quote =
        target.quotes[
          Math.floor(Math.random() * target.quotes.length)
        ];

      return send(res, 200, {
        file: fileKey,
        kategori: target.kategori,
        quote
      });
    } catch {
      return send(res, 404, { error: "File tidak ditemukan" });
    }
  }

  return send(res, 404, { error: "Endpoint tidak tersedia" });
}
