const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MySQL connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Sdg#0619',
    database: 'Zest',
});

// Connect to database with error handling
db.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL database.');
});

// Test database connection route
app.get('/test-db', (req, res) => {
    db.query('SELECT 1', (err, results) => {
        if (err) {
            console.error('Database test failed:', err);
            res.status(500).json({ error: 'Database connection failed', details: err.message });
        } else {
            res.json({ message: 'Database connection successful', results });
        }
    });
});

// Root route
app.get('/', (req, res) => {
    res.send('Welcome to the Zest Event API');
});

// Get all events
app.get('/events', (req, res) => {
    const sql = "SELECT * FROM events ORDER BY event_date_time DESC";
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching events:', err);
            res.status(500).json({ message: 'Failed to fetch events', error: err.message });
        } else {
            res.status(200).json(results);
        }
    });
});

// Get events by type
app.get('/api/events/:type', (req, res) => {
    const eventType = req.params.type;
    const sql = "SELECT * FROM events WHERE event_type = ? ORDER BY event_date_time DESC";
    
    db.query(sql, [eventType], (err, results) => {
        if (err) {
            console.error('Error fetching events by type:', err);
            res.status(500).json({ message: 'Failed to fetch events', error: err.message });
        } else {
            res.status(200).json(results);
        }
    });
});

// Add new event with detailed error handling
app.post('/api/add-event', (req, res) => {
    const { 
        event_type,
        event_image, 
        event_title, 
        hosting_club, 
        event_date_time, 
        event_venue, 
        event_registration_link, 
        about_event 
    } = req.body;

    // Log received data
    console.log('Received event data:', {
        event_type,
        event_image, 
        event_title, 
        hosting_club, 
        event_date_time, 
        event_venue, 
        event_registration_link, 
        about_event
    });

    // Validate required fields
    const requiredFields = {
        event_type,
        event_image, 
        event_title, 
        hosting_club, 
        event_date_time, 
        event_venue, 
        event_registration_link, 
        about_event
    };

    const missingFields = Object.entries(requiredFields)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingFields.length > 0) {
        console.error('Missing required fields:', missingFields);
        return res.status(400).json({ 
            message: 'Missing required fields', 
            fields: missingFields 
        });
    }

    const sql = `
        INSERT INTO events (
            event_type, 
            event_image, 
            event_title, 
            hosting_club, 
            event_date_time, 
            event_venue, 
            event_registration_link, 
            about_event
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        event_type,
        event_image, 
        event_title, 
        hosting_club, 
        event_date_time, 
        event_venue, 
        event_registration_link, 
        about_event
    ];

    // Log SQL query and values
    console.log('Executing SQL Query:', sql);
    console.log('With values:', values);

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error('MySQL Error:', err);
            return res.status(500).json({ 
                message: 'Failed to add event',
                error: err.message,
                sqlMessage: err.sqlMessage,
                sqlState: err.sqlState
            });
        }
        
        console.log('Event added successfully:', result);
        res.status(200).json({ 
            message: 'Event added successfully', 
            eventId: result.insertId 
        });
    });
});

// Delete event endpoint
app.delete('/api/events/:id', (req, res) => {
    const eventId = req.params.id;
    const sql = "DELETE FROM events WHERE id = ?";
    
    db.query(sql, [eventId], (err, result) => {
        if (err) {
            console.error('Error deleting event:', err);
            res.status(500).json({ message: 'Failed to delete event', error: err.message });
        } else if (result.affectedRows === 0) {
            res.status(404).json({ message: 'Event not found' });
        } else {
            res.status(200).json({ message: 'Event deleted successfully' });
        }
    });
});

// Global error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({ 
        message: 'An unexpected error occurred', 
        error: err.message 
    });
});

// Handle database errors
db.on('error', (err) => {
    console.error('Database error:', err);
    if (err.code === 'PROTOCOL_CONNECTION_LOST') {
        console.log('Database connection was closed. Attempting to reconnect...');
        // Implement reconnection logic if needed
    } else {
        throw err;
    }
});

// Start the server
const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});