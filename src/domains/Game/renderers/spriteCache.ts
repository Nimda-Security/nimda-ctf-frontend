/**
 * 선택적 이미지 스프라이트 캐시.
 * 개별 가구·캐릭터 데이터에 `spriteUrl`을 지정하면 임시 도형 대신 실제 이미지를 그린다.
 */
const loadedImages = new Map<string, HTMLImageElement | 'loading' | 'error'>();

export const getCachedSprite = (url?: string): HTMLImageElement | null => {
  if (!url) return null;
  const cached = loadedImages.get(url);
  if (cached instanceof HTMLImageElement) return cached;
  if (cached === 'loading' || cached === 'error') return null;

  loadedImages.set(url, 'loading');
  const img = new Image();
  img.onload = () => {
    loadedImages.set(url, img);
  };
  img.onerror = () => {
    loadedImages.set(url, 'error');
  };
  img.src = url;
  return null;
};
