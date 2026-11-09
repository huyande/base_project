/**
 * 截断字符串到指定长度（按 UTF-16 码元计，不补省略号）。
 * 用于微信订阅消息 thing/name 等有长度上限的字段。
 */
export function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max) : text;
}
