export const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const easeInOutCubic = t => t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;
export const easeOutExpo = t => t === 1 ? 1 : 1 - 2 ** (-10 * t);
export const easeOutQuint = t => 1 - (1 - t) ** 5;

