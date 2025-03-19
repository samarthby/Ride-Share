// server.js
const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const mysql = require('mysql');
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// MySQL connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err.message);
        return;
    }
    console.log('Connected to MySQL');
});

// Middleware to serve static files
app.use(express.static('public'));
app.use(express.json()); // Middleware to parse JSON bodies

// Endpoint for geocoding
app.get('/api/geocode', async (req, res) => {
    const { location } = req.query;
    try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json`);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching geocoding data:', error.message);
        res.status(500).send('Error fetching geocoding data');
    }
});

// Endpoint for routing
app.get('/api/route', async (req, res) => {
    const { start, end } = req.query;
    const routingUrl = `https://api.openrouteservice.org/v2/directions/driving-car?start=${start}&end=${end}&api_key=${process.env.OPENROUTESERVICE_API_KEY}`;

    console.log('Routing URL:', routingUrl); // Log the routing URL
    try {
        const response = await axios.get(routingUrl);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching routing data:', error.message);
        res.status(500).send('Error fetching routing data');
    }
});

// Endpoint to save ride details
app.post('/api/rides', (req, res) => {
    const { driver_id, start_lat, start_lng, end_lat, end_lng, route_polyline, destination_name } = req.body;
    const query = 'INSERT INTO rides (driver_id, start_lat, start_lng, end_lat, end_lng, route_polyline, destination_name) VALUES (?, ?, ?, ?, ?, ?, ?)';
    db.query(query, [driver_id, start_lat, start_lng, end_lat, end_lng, route_polyline, destination_name], (err, result) => {
        if (err) {
            console.error('Error saving ride:', err.message);
            return res.status(500).send('Error saving ride');
        }
        res.status(201).send({ ride_id: result.insertId });
    });
});

// Endpoint to fetch available rides
app.get('/api/rides', (req, res) => {
    const { destination_lat, destination_lng } = req.query;
    const query = 'SELECT * FROM rides WHERE end_lat = ? AND end_lng = ?';
    db.query(query, [destination_lat, destination_lng], (err, results) => {
        if (err) {
            console.error('Error fetching rides:', err.message);
            return res.status(500).send('Error fetching rides');
        }
        console.log('Fetched rides:', results); // Log the fetched rides
        res.json(results);
    });
});

// Endpoint to fetch ride tracking data
app.get('/api/ride_tracking', (req, res) => {
    const { ride_id } = req.query;
    const query = 'SELECT * FROM ride_tracking WHERE ride_id = ? ORDER BY last_updated DESC LIMIT 1';
    db.query(query, [ride_id], (err, results) => {
        if (err) {
            console.error('Error fetching tracking data:', err.message);
            return res.status(500).send('Error fetching tracking data');
        }
        res.json(results[0]);
    });
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});