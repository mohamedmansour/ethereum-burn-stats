
export function debounce(func: (...args: any[]) => void, waitInMs: number) {
    let timeoutHandle: number;
  
    return (...args: any[]) => {
      clearTimeout(timeoutHandle);
      timeoutHandle = window.setTimeout(() => {
        func(...args);
      }, waitInMs);
    };
  }