
const properties = require("./json/properties.json");
const users = require("./json/users.json");

const { Pool } = require('pg');

const config = {
    user: 'labber',
    password: '123',
    host: 'localhost',
    database: 'lightbnb',
    port: 5432
};

const pool = new Pool(config);

pool.connect();

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail =  (email) => {
  return pool.query(`SELECT * FROM users WHERE email = $1;`, [email])
    .then((response) => {
     const user = response.rows[0]; // if it empty undefined || user object
     return user;
    })
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = (id) => {
  return pool.query(`SELECT * FROM users WHERE id = $1`, [id])
    .then((response) => {
   const user = response.rows[0];
   return user;
    })
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = (user) => {
  const queryString = `INSERT INTO users (name, email, password) 
  VALUES ($1, $2, $3)
  RETURNING *;`;
  const values = [user.name, user.email, user.password];

  return pool
     .query(queryString, values)
     .then((response) => {
      return response.rows[0]
     })
     .catch((err) => {
      console.log(err);
     })
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = (guest_id, limit = 10) => {

 const queryString = `SELECT reservations.*, properties.*, avg(property_reviews.rating) as average_rating
 FROM reservations
 JOIN properties ON properties.id = reservations.property_id
 JOIN property_reviews ON properties.id = property_reviews.property_id
 WHERE reservations.guest_id = $1
 AND end_date < now()::date
 GROUP BY properties.id, reservations.id
 ORDER BY reservations.start_date
 LIMIT $2;`;

 const values = [guest_id, limit];

return pool.query(queryString, values)
   .then((response) => {
    return response.rows;
  })
   .catch((err) => {
    console.log(err);
   })
  // return getAllProperties(null, 2);
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = '10') => {
  console.log(options);
  
  const queryParams = [];

  let queryString = `
  SELECT properties.*, AVG(rating) AS average_rating
  FROM properties
  LEFT JOIN property_reviews ON properties.id = property_id
  `;

  if (options.city) {
    queryParams.push(`%${options.city.slice(1)}%`);
    queryString += `WHERE city LIKE $${queryParams.length}`;
  }

  if (options.owner_id) {
    if (queryString.includes('WHERE')) {
      queryString += ` AND `;
    } else {
      queryString += ` WHERE `;
    }

    queryParams.push(Number(options.owner_id));
    queryString += ` owner_id = $${queryParams.length}`;
  }

  if (options.minimum_price_per_night) {
    if (queryString.includes('WHERE')) {
      queryString += ` AND `;
    } else {
      queryString += ` WHERE `;
    }

    queryParams.push(Number(options.minimum_price_per_night));
    queryString += `cost_per_night >= $${queryParams.length}`;
  }

  if (options.maximum_price_per_night) {
    if (queryString.includes('WHERE')) {
      queryString += ` AND `;
    } else {
      queryString += ` WHERE `;
    }

    queryParams.push(Number(options.maximum_price_per_night));
    queryString += `cost_per_night < $${queryParams.length}`;
  }

  queryString += `
  GROUP BY properties.id
  `;

  if (options.minimum_rating) {
    queryParams.push(Number(options.minimum_rating));
    queryString += `HAVING AVG(rating) >= $${queryParams.length}`;
  }

  queryParams.push(limit);
  queryString += `
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;
  
  console.log(queryString, queryParams);

  return pool.query(queryString, queryParams)
    .then(response => {
      console.log(response.rows);
      return response.rows;
    })
    .catch(err => {
      console.error('query error', err.stack);
      return null;
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = (property) => {
  const queryString = `INSERT INTO properties (owner_id, title, 
    description, thumbnail_photo_url, cover_photo_url,
     cost_per_night, street, city, province, post_code, 
     country, parking_spaces, number_of_bathrooms, number_of_bedrooms) 
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
  RETURNING *;`;
  const queryParams = [
    Number(property.owner_id),
    String(property.title),
    String(property.description),
    String(property.thumbnail_photo_url),
    String(property.cover_photo_url),
    String(property.cost_per_night),
    String(property.street),
    String(property.city),
    String(property.province),
    String(property.post_code),
    String(property.country),
    Number(property.parking_spaces),
    Number(property.number_of_bathrooms),
    Number(property.number_of_bedrooms)
  ];

  return pool
     .query(queryString, queryParams)
     .then((response) => {
      return response.rows[0]
     })
     .catch((err) => {
      console.log(err);
     })
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
