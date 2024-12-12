// routes/index.js — файл маршрутизации для конкретных путей (например, главная страница).

import express from 'express';
import axios from 'axios';
const router = express.Router();

// Главная страница с поддержкой сортировки
router.get('/', async (req, res) => {
  const { sort } = req.query;
  let orderBy = 'created_at DESC'; // По умолчанию сортировка по дате добавления

  if (sort === 'title') {
    orderBy = 'title ASC';
  } else if (sort === 'author') {
    orderBy = 'author ASC';
  } else if (sort === 'rating') {
    orderBy = 'rating DESC';
  }

  try {
    const { db } = req.app.locals;
    const result = await db.query(`SELECT * FROM books ORDER BY ${orderBy}`);
    res.render('index', { title: 'Book Notes', books: result.rows, currentSort: sort || 'default' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Маршрут для отображения формы добавления новой книги
router.get('/books/new', (req, res) => {
  res.render('new', { title: 'Добавить новую книгу' });
});

// Обработка добавления новой книги
router.post('/books', async (req, res) => {
  const { title, author, isbn, description, rating } = req.body;
  let cover_id = null;

  if (isbn) {
    try {
      // Запрос к Open Library API для получения cover_id
      const response = await axios.get('https://openlibrary.org/api/books', {
        params: {
          bibkeys: `ISBN:${isbn}`,
          format: 'json',
          jscmd: 'data',
        },
      });
      const data = response.data;
      const bookData = data[`ISBN:${isbn}`];
      if (bookData && bookData.cover) {
        // Извлечение cover_id из URL обложки
        const coverUrl = bookData.cover.large || bookData.cover.medium || bookData.cover.small;
        const match = coverUrl.match(/\/b\/id\/(\d+)-/);
        if (match) {
          cover_id = parseInt(match[1], 10);
          console.log(`Получен cover_id: ${cover_id} для ISBN: ${isbn}`);
        } else {
          console.log(`Не удалось извлечь cover_id из URL: ${coverUrl}`);
        }
      } else {
        console.log(`Обложка не найдена для ISBN: ${isbn}`);
      }
    } catch (error) {
      console.error('Ошибка при получении cover_id:', error);
    }
  } else {
    console.log('ISBN не предоставлен, cover_id не будет установлен.');
  }

  try {
    const { db } = req.app.locals;
    await db.query(
        'INSERT INTO books (title, author, isbn, description, cover_id, rating) VALUES ($1, $2, $3, $4, $5, $6)',
        [title, author, isbn, description, cover_id, rating || 0]
    );
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера');
  }
});

// Маршрут для отображения деталей книги
router.get('/books/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { db } = req.app.locals;
    const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).render('error', { message: 'Книга не найдена' });
    }
    const book = result.rows[0];
    res.render('show', { title: book.title, book });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка сервера при загрузке книги для редактирования' });
  }
});

// Маршрут для отображения формы редактирования книги
router.get('/books/:id/edit', async (req, res) => {
  const { id } = req.params;
  try {
    const { db } = req.app.locals;
    const result = await db.query('SELECT * FROM books WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).render('error', { message: 'Книга не найдена' });
    }
    const book = result.rows[0];
    res.render('edit', { title: `Редактировать ${book.title}`, book });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { message: 'Ошибка сервера при загрузке книги для редактирования' });
  }
});

// Обработка обновления книги
router.put('/books/:id', async (req, res) => {
  const { id } = req.params;
  const { title, author, isbn, description, rating } = req.body;
  let cover_id = null;

  if (isbn) {
    try {
      // Запрос к Open Library API для получения cover_id
      const response = await axios.get('https://openlibrary.org/api/books', {
        params: {
          bibkeys: `ISBN:${isbn}`,
          format: 'json',
          jscmd: 'data',
        },
      });
      const data = response.data;
      const bookData = data[`ISBN:${isbn}`];
      if (bookData && bookData.cover) {
        // Извлечение cover_id из URL обложки
        const coverUrl = bookData.cover.large || bookData.cover.medium || bookData.cover.small;
        const match = coverUrl.match(/\/b\/id\/(\d+)-/);
        if (match) {
          cover_id = parseInt(match[1], 10);
          console.log(`Получен cover_id: ${cover_id} для ISBN: ${isbn}`);
        } else {
          console.log(`Не удалось извлечь cover_id из URL: ${coverUrl}`);
        }
      } else {
        console.log(`Обложка не найдена для ISBN: ${isbn}`);
      }
    } catch (error) {
      console.error('Ошибка при получении cover_id:', error);
    }
  } else {
    console.log('ISBN не предоставлен, cover_id не будет установлен.');
  }

  try {
    const { db } = req.app.locals;
    await db.query(
        'UPDATE books SET title = $1, author = $2, isbn = $3, description = $4, cover_id = $5, rating = $6 WHERE id = $7',
        [title, author, isbn, description, cover_id, rating || 0, id]
    );
    res.redirect(`/books/${id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при обновлении книги');
  }
});

// Обработка удаления книги
router.delete('/books/:id', async (req, res) => {
  const { id } = req.params; // params это свойство объекта req. Здесь :id является параметром маршрута.
  try {
    const { db } = req.app.locals;
    await db.query('DELETE FROM books WHERE id = $1', [id]);
    res.redirect('/');
  } catch (err) {
    console.error(err);
    res.status(500).send('Ошибка сервера при удалении книги');
  }
});

export default router;
