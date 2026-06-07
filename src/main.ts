import { startApp } from './app';

const app = document.getElementById('app')!;
startApp(app).catch((err) => {
  app.textContent = 'Failed to load orbital data. Check your connection and refresh.';
  console.error(err);
});
