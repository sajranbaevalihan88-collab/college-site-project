require('dotenv').config();
const cluster = require('cluster');
const os = require('os');

// Ловим необработанные ошибки до запуска
process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

const numCPUs = os.cpus().length;

if (cluster.isPrimary && process.env.NODE_ENV === 'production') {
  console.log(`Запускаем ${numCPUs} воркеров...`);
  for (let i = 0; i < numCPUs; i++) cluster.fork();
  cluster.on('exit', (w) => {
    console.log(`Воркер ${w.process.pid} упал, перезапуск`);
    cluster.fork();
  });
} else {
  startServer();
}

function startServer() {
  const express    = require('express');
  const cors       = require('cors');
  const path       = require('path');
  const helmet     = require('helmet');
  const hpp        = require('hpp');
  const rateLimit  = require('express-rate-limit');
  const morgan     = require('morgan');
  const compression = require('compression');
  const { initDb } = require('./database');

  const app  = express();
  const PORT = process.env.PORT || 5000;

  // ── Безопасность ─────────────────────────────────────────────────────────
  // helmet без строгого CSP — иначе блокирует Google Fonts, Font Awesome, CDN скрипты
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false
  }));

  // Защита от дублирования параметров (hpp работает нормально)
  app.use(hpp());

  // ── Логирование, сжатие ───────────────────────────────────────────────────
  app.use(compression());
  app.use(morgan('dev'));

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }));

  // ── Парсинг тела запроса ──────────────────────────────────────────────────
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Rate limiting ─────────────────────────────────────────────────────────
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 минута
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много запросов, попробуйте позже.' }
  });
  app.use('/api/', apiLimiter);

  // Отдельный строгий лимит на логин (защита от брутфорса)
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 минут
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Слишком много попыток входа. Попробуйте через 15 минут.' }
  });
  app.use('/api/auth/login', loginLimiter);

  // ── Статические файлы ─────────────────────────────────────────────────────
  app.use(express.static(path.join(__dirname, '../frontend/public')));
  app.use('/css',     express.static(path.join(__dirname, '../frontend/css')));
  app.use('/js',      express.static(path.join(__dirname, '../frontend/js')));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  app.use('/img',     express.static(path.join(__dirname, '../frontend/public/img')));

  // ── Swagger (только в разработке) ────────────────────────────────────────
  try {
    const swaggerUi = require('swagger-ui-express');
    const swaggerDocument = require('./swagger.json');
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
  } catch (e) {
    console.warn('swagger.json не найден, /api-docs отключён');
  }

  // ── API маршруты ──────────────────────────────────────────────────────────
  app.use('/api/auth',          require('./routes/auth'));
  app.use('/api/users',         require('./routes/users'));
  app.use('/api/students',      require('./routes/students'));
  app.use('/api/groups',        require('./routes/groups'));
  app.use('/api/subjects',      require('./routes/subjects'));
  app.use('/api/schedule',      require('./routes/schedule'));
  app.use('/api/grades',        require('./routes/grades'));
  app.use('/api/attendance',    require('./routes/attendance'));
  app.use('/api/dashboard',     require('./routes/dashboard'));
  app.use('/api/notifications', require('./routes/notifications'));
  app.use('/api/lessons',       require('./routes/lessons'));
  app.use('/api/reports',       require('./routes/reports'));

  // ── HTML маршруты ─────────────────────────────────────────────────────────
  const pub = path.join(__dirname, '../frontend/public');
  app.get('/',          (req, res) => res.sendFile(path.join(pub, 'index.html')));
  app.get('/login',     (req, res) => res.sendFile(path.join(pub, 'login.html')));
  app.get('/register',  (req, res) => res.sendFile(path.join(pub, 'register.html')));
  app.get('/dashboard', (req, res) => res.sendFile(path.join(pub, 'dashboard.html')));

  // ── Глобальный обработчик ошибок ──────────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message || err);
    res.status(err.status || 500).json({ error: err.message || 'Внутренняя ошибка сервера' });
  });

  // ── Старт ─────────────────────────────────────────────────────────────────
  initDb()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`✓ Сервер запущен: http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('[FATAL] Не удалось инициализировать БД:', err);
      process.exit(1);
    });
}
