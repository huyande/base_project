import { truncate } from './string.util';

describe('truncate', () => {
  it('短于上限原样返回', () => {
    expect(truncate('画画课', 20)).toBe('画画课');
  });
  it('等于上限原样返回', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });
  it('超长截断到上限', () => {
    expect(truncate('abcdefghijklmnopqrstuvwxyz', 5)).toBe('abcde');
  });
  it('中文按字符计（UTF-16 码元）', () => {
    expect(truncate('一二三四五六', 3)).toBe('一二三');
  });
});
