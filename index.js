const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();

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
  const { searchType, query, limit = 100, offset = 0 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter is required.' });
  }

  console.log({searchType, query});
  

  try {
    let results = [];
    if (searchType === 'title_number') {

      console.log("Title Number");

      const [ownPropertyResults, overseasResults] = await Promise.all([
        pool.promise().query(
          `SELECT * 
           FROM ch_all_companies_own_property
           WHERE \`Title Number\` = ?
           LIMIT ? OFFSET ?`,
          [query, limit, offset]
        ),
        pool.promise().query(
          `SELECT * 
           FROM overseas_companies_holding_uk_property
           WHERE \`Title Number\` = ?
           LIMIT ? OFFSET ?`,
          [query, limit, offset]
        ),
      ]);
      results = [...ownPropertyResults[0], ...overseasResults[0]];
      console.log(results);

    } else if (searchType === 'company_number') {    
      
      console.log("Compnay Number");
      
      const [companyResults] = await pool.promise().query(
        `SELECT * 
         FROM public_house_registered_as_a_company
         WHERE \`CompanyNumber\` = ?
         LIMIT ? OFFSET ?`,
        [query, limit, offset]
      );
      results = companyResults;
      console.log(results);

    } else if (searchType === 'company_name') {
      
      console.log("Compnay Name");

      const [nameResults] = await pool.promise().query(
        `SELECT * 
         FROM public_house_registered_as_a_company
         WHERE \`CompanyName\` LIKE ?
         LIMIT ? OFFSET ?`,
        [`%${query}%`, limit, offset]
      );
      results = nameResults;
      console.log(results);
      
    } else {
      return res.status(400).json({ error: 'Invalid search type' });
    }

    res.json({ results });
  } catch (err) {
    console.error('Error fetching data:', err);
    res.status(500).json({ error: 'Database query failed. Please try again later.' });
  }
});

// Start the Server
app.listen(port, () => console.log(`Server running on port ${port}`));
