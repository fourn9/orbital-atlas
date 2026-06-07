import { startApp } from './app';

const app = document.getElementById('app')!;

function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch {
    return false;
  }
}

if (!hasWebGL()) {
  app.textContent = 'This 3D viewer requires WebGL, which is not available in your browser or environment.';
} else {
  startApp(app).catch((err) => {
    app.textContent = 'Failed to load orbital data. Check your connection and refresh.';
    console.error(err);
  });
}
