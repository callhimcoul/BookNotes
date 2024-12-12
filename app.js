// app.js — основной файл приложения, где настраивается сервер и общие настройки.

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pkg from 'pg';
import methodOverride from 'method-override';
const { Pool } = pkg;

// Загрузка переменных окружения
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Настройка EJS как шаблонизатора
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Парсинг тела запроса
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Метод-оверрайд для поддержки PUT и DELETE
app.use(methodOverride('_method'));

// Подключение к базе данных PostgreSQL
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_DATABASE,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Проверка подключения к базе данных
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Ошибка подключения к базе данных', err.stack);
  }
  console.log('Подключение к базе данных установлено');
  release();
});

// Сделаем pool доступным в маршрутах через объект app.locals
app.locals.db = pool;

// Импорт и использование маршрутов
import indexRouter from './routes/index.js';
app.use('/', indexRouter);

// Обработка 404 ошибок
app.use((req, res, next) => {
  res.status(404).render('error', { message: 'Страница не найдена' });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
