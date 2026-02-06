export function isMobile(): boolean {
    if (typeof window === 'undefined') return false;
  
    return /android|iphone|ipad|ipod|mobile/i.test(
      navigator.userAgent || ''
    );
  }
  