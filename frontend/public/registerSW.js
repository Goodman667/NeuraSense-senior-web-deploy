if ('serviceWorker' in navigator) {
  const reloadOnce = () => {
    if (sessionStorage.getItem('neurasense-sw-reloaded') === '1') return;
    sessionStorage.setItem('neurasense-sw-reloaded', '1');
    window.location.reload();
  };

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then((registration) => {
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated' && navigator.serviceWorker.controller) reloadOnce();
        });
      });

      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }

      return registration.update();
    }).catch(() => {});
  });

  navigator.serviceWorker.addEventListener('controllerchange', reloadOnce);
}
