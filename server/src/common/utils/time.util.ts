import type { ValueTransformer } from 'typeorm';

/** MySQL time 列读出为 HH:mm:ss，API 统一返回 HH:mm */
export const timeToHHmmTransformer: ValueTransformer = {
  to: (value: string | null) => value,
  from: (value: string | null) => (value ? value.slice(0, 5) : value),
};
