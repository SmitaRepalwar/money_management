const express = require("express");
const { Pool } = require('pg');
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(bodyParser.json());

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
      }
});

pool.connect((err) => {
  if (err) throw err
  console.log('Connected to the PostgreSQL database');
});


app.get('/', async (req, res) => {
  try {
    const query = 'SELECT * FROM transactions ORDER BY id DESC';
    const { rows } = await pool.query(query);
    res.json(rows);
  } catch (err) {
    console.error('Database query error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

app.post('/add', async (req, res) => {
  try {
    const { id, type, amount, description, date } = req.body;

    // Convert the date to PostgreSQL-compatible format
    const formattedDate = new Date(date).toISOString().slice(0, 19).replace('T', ' ');

    const getQuery = 'SELECT running_balance FROM transactions ORDER BY id DESC LIMIT 1';
    const { rows } = await pool.query(getQuery);

    let balance = rows.length > 0 ? rows[0].running_balance : 0;

    let running_balance;
    switch (type) {
      case 'credit':
        running_balance = parseInt(balance) + parseInt(amount);
        break;
      case 'debit':
        running_balance = balance - amount;
        break;
      default:
        return res.status(400).json({ error: 'Invalid transaction type' });
    }

    const data = [id, type, amount, description, formattedDate, running_balance];

    const query = 'INSERT INTO transactions (id, type, amount, description, date, running_balance) VALUES ($1, $2, $3, $4, $5, $6)';
    await pool.query(query, data);
    res.status(201).json({ message: 'Transaction added successfully' });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database error' });
  }
});

const port = process.env.PORT || 4000;
const HOST = '0.0.0.0'; // Bind to all network interfaces

app.listen(port, HOST, () => {
  console.log(`Listening at port number ${HOST}:${port}`);
});
