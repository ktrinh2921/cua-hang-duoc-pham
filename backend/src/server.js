/**
 * Server Entry Point
 */
require('dotenv').config();
const app = require('./app');
const db = require('./config/db');

const PORT = process.env.PORT || 8080;

// Start server
async function startServer() {
    try {
        // Test database connection
        console.log('🔄 Connecting to database...');
        const dbConnected = await db.testConnection();
        
        if (!dbConnected) {
            console.warn('⚠️  Database connection failed. Server will start but database features may not work.');
        }
        
        // Start Express server
        const host = `http://localhost:${PORT}`;
        app.listen(PORT, () => {
            console.log('');
            console.log('╔══════════════════════════════════════════════════════════════╗');
            console.log('║           SecurePharma Backend Server                      ║');
            console.log('╠══════════════════════════════════════════════════════════════╣');
            console.log(`║  🌐 Server running on: ${host.padEnd(38)}║`);
            console.log(`║  📊 Health check:      ${(host + '/api/health').padEnd(38)}║`);
            console.log(`║  📖 API Docs (Swagger): ${(host + '/api/docs').padEnd(36)}║`);
            console.log(`║  📄 OpenAPI JSON spec:  ${(host + '/api/docs.json').padEnd(35)}║`);
            console.log(`║  🔧 Environment:       ${(process.env.NODE_ENV || 'development').padEnd(28)}║`);
            console.log('╚══════════════════════════════════════════════════════════════╝');
            console.log('');
        });
    } catch (err) {
        console.error('❌ Failed to start server:', err.message);
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received. Shutting down gracefully...');
    await db.closePool();
    process.exit(0);
});

// Start the server
startServer();
