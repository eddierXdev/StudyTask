const path = require('node:path');
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const environment = require('./config/environment');
const homeRoutes = require('./routes/homeRoutes');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const adminRoutes = require('./routes/adminRoutes');
const {
  ensureCsrfSession,
  doubleCsrfProtection,
  provideCsrfToken,
} = require('./middlewares/csrf');
const { notFoundHandler, errorHandler } = require('./middlewares/errorHandler');

const app = express();

if (environment.isProduction) {
  app.set('trust proxy', 1);
}

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('layout', 'layouts/main');
app.locals.currentYear = new Date().getFullYear();

app.use(expressLayouts);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        'upgrade-insecure-requests': environment.isProduction ? [] : null,
      },
    },
  })
);
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use(cookieParser());
app.use(
  '/vendor/bootstrap',
  express.static(path.join(__dirname, 'node_modules/bootstrap/dist'))
);
app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

app.use(ensureCsrfSession);
app.use(doubleCsrfProtection);
app.use(provideCsrfToken);

app.use('/', homeRoutes);
app.use('/', authRoutes);
app.use('/', dashboardRoutes);
app.use('/tasks', taskRoutes);
app.use('/admin', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
