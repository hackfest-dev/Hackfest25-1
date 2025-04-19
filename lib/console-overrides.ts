// Silence unnecessary debug logs in development
if (process.env.NODE_ENV === 'development') {
  const originalConsoleError = console.error;
  console.error = (...args) => {
    // Filter out some common Next.js development logs
    const message = args.length > 0 ? args[0]?.toString() : '';
    if (message.includes('Fast Refresh')) return;
    if (message.includes('useLayoutEffect does nothing on the server')) return;
    if (message.includes('Warning: ReactDOM.render')) return;
    if (message.includes('Warning: Expected server HTML')) return;
    originalConsoleError(...args);
  };
  
  const originalConsoleWarn = console.warn;
  console.warn = (...args) => {
    // Filter out commonly repeated warnings
    const message = args.length > 0 ? args[0]?.toString() : '';
    if (message.includes('Using Router() is deprecated')) return;
    originalConsoleWarn(...args);
  };
} 