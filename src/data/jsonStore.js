import fs from "fs-extra";
import path from "path";

export async function readJsonSafe(filePath, defaultValue = {}) {
  try {
    const data = await fs.readJson(filePath);
    if (data && typeof data === "object") {
      return data;
    }
    return defaultValue;
  } catch (err) {
    if (err && err.code !== "ENOENT") {
      console.warn(`⚠️ Failed to read JSON file ${filePath}:`, err.message);
    }
    return defaultValue;
  }
}

export async function writeJsonSafe(filePath, data) {
  const dir = path.dirname(filePath);
  await fs.ensureDir(dir);
  try {
    await fs.writeJson(filePath, data, { spaces: 2 });
  } catch (err) {
    console.warn(`⚠️ Failed to write JSON file ${filePath}:`, err.message);
  }
}
