import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};

  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith(';')) {
      continue;
    }

    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

/**
 * 在 Nest 启动前加载 .env 文件。
 * 平台注入的非空环境变量优先；空字符串视为未配置，允许 .env 覆盖。
 */
export function loadEnvFiles(): void {
  const nodeEnv = process.env.NODE_ENV ?? 'development';
  const files = ['.env', `.env.${nodeEnv}`];

  for (const file of files) {
    const filePath = resolve(process.cwd(), file);
    if (!existsSync(filePath)) {
      continue;
    }

    const parsed = parseEnvFile(readFileSync(filePath, 'utf-8'));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === '') {
        process.env[key] = value;
      }
    }
  }
}
