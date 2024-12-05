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
  connectionLimit: process.env.DB_CONNECTION_LIMIT || 10,
  queueLimit: 0,
  connectTimeout: 30000,
  acquireTimeout: 30000,
});

// Test MySQL connection on server start
pool.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to the database:', err.message);
    console.error('Error code:', err.code);
    process.exit(1);
  } else {
    console.log('Database connected successfully!');
    connection.release();
  }
});

// Search Endpoint
app.post('/search', async (req, res) => {
  const { query } = req.body;

  try {
    const promises = [
      pool.promise().query(
        `SELECT * FROM ch_all_companies_own_property
         WHERE \`Title Number\` LIKE ? OR \`Property Address\` LIKE ? OR \`District\` LIKE ? 
           OR \`County\` LIKE ? OR \`Region\` LIKE ? OR \`Postcode\` LIKE ? 
           OR \`Proprietor Name (1)\` LIKE ? OR \`Proprietor Name (2)\` LIKE ?`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
      ),
      pool.promise().query(
        `SELECT * FROM overseas_companies_holding_uk_property
         WHERE \`Title Number\` LIKE ? OR \`Property Address\` LIKE ? OR \`District\` LIKE ? 
           OR \`County\` LIKE ? OR \`Region\` LIKE ? OR \`Postcode\` LIKE ? 
           OR \`Proprietor Name (1)\` LIKE ? OR \`Proprietor Name (2)\` LIKE ?`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
      ),
      pool.promise().query(
        `SELECT * FROM public_house_registered_as_a_company
         WHERE \`CompanyName\` LIKE ? OR \`RegAddress.AddressLine1\` LIKE ? OR \`RegAddress.AddressLine2\` LIKE ? 
           OR \`RegAddress.PostTown\` LIKE ? OR \`RegAddress.County\` LIKE ? OR \`RegAddress.PostCode\` LIKE ?`,
        [`%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`, `%${query}%`]
      ),
    ];

    const [companiesOwnProperty, overseasCompaniesHoldingProperty, publicHouseRegistered] = await Promise.all(promises);

    res.json({
      companiesOwnProperty: companiesOwnProperty[0],
      overseasCompaniesHoldingProperty: overseasCompaniesHoldingProperty[0],
      publicHouseRegistered: publicHouseRegistered[0],
    });
  } catch (err) {
    console.error('Error fetching data:', err.message);
    res.status(500).send({ error: 'Error searching the database' });
  }
});

// Start the Server
app.listen(port, () => console.log(`Server running on port ${port}`));
