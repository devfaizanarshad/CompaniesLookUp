const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config(); // Load environment variables

const app = express();
const port = 5000;

app.use(bodyParser.json());
app.use(cors());

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 50,
  queueLimit: 0,
  connectTimeout: 30000,
  acquireTimeout: 30000,
});

// Test MySQL connection on server start
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    process.exit(1);
  } else {
    console.log('Database connected successfully!');
    connection.release();
  }
});

// Search Endpoint
app.post('/search', async (req, res) => {
  const { query, limit = 50, offset = 0 } = req.body;

  try {
    const promises = [
      pool.promise().query(
        `SELECT * 
         FROM ch_all_companies_own_property
         WHERE \`Title Number\` = ? 
            OR \`Proprietor Name (1)\` = ? 
            OR \`Proprietor Name (2)\` = ? 
            OR \`County\` = ?
         LIMIT ? OFFSET ?`,
        [query, query, query, query, limit, offset]
      ),
      pool.promise().query(
        `SELECT * 
         FROM overseas_companies_holding_uk_property
         WHERE \`Title Number\` = ? 
            OR \`Proprietor Name (1)\` = ? 
            OR \`Proprietor Name (2)\` = ? 
            OR \`County\` = ?
         LIMIT ? OFFSET ?`,
        [query, query, query, query, limit, offset]
      ),
      pool.promise().query(
        `SELECT * 
         FROM public_house_registered_as_a_company
         WHERE \`CompanyNumber\` IN (?, ?)
            OR \`CompanyName\` IN (?, ?)
         LIMIT ? OFFSET ?`,
        [query, query, query, query, limit, offset]
      ),
    ];

    const [companiesOwnProperty, overseasCompaniesHoldingProperty, publicHouseRegistered] = await Promise.all(promises);

    res.json({
      companiesOwnProperty: companiesOwnProperty[0],
      overseasCompaniesHoldingProperty: overseasCompaniesHoldingProperty[0],
      publicHouseRegistered: publicHouseRegistered[0],
    });
  } catch (err) {
    console.error('Error fetching data:', {
      message: err.message,
      stack: err.stack,
      queryParams: req.body,
    });
    res.status(500).send({ error: 'Database query failed. Please try again.' });
  }
});

// Start the Server
app.listen(port, () => console.log(`Server running on port ${port}`));
