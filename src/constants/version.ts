// vite.config.ts에서 package.json 버전을 주입합니다.
export const APP_VERSION = __APP_VERSION__;

export const addVersionToHeaders = (
  customHeaders: Record<string, string> = {}
): Record<string, string> => ({
  ...customHeaders,
  'X-App-Version': APP_VERSION,
});
