/**
 * Database Configuration Helper
 * Web Programming CSCI 3403 - Fall 2025
 * Instructor: bobby reed
 *
 * Shared utilities for database connection and response formatting
 */

const { neon } = require('@neondatabase/serverless');

/**
 * Get database connection
 * @returns {Function} SQL query function
 */
function getDB() {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
        throw new Error('DATABASE_URL environment variable is not configured');
    }

    return neon(connectionString);
}

/**
 * Create success response
 * @param {Object} data - Data to include in response
 * @returns {Object} Netlify function response object
 */
function successResponse(data) {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: true,
            ...data
        })
    };
}

/**
 * Create error response
 * @param {Error} error - Error object
 * @param {number} statusCode - HTTP status code (default 500)
 * @returns {Object} Netlify function response object
 */
function errorResponse(error, statusCode = 500) {
    console.error('Error:', error);

    return {
        statusCode,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            success: false,
            error: error.message || 'An error occurred'
        })
    };
}

/**
 * Handle OPTIONS preflight requests
 * @returns {Object} Netlify function response object
 */
function handleOptions() {
    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS'
        },
        body: ''
    };
}

module.exports = {
    getDB,
    successResponse,
    errorResponse,
    handleOptions
};
