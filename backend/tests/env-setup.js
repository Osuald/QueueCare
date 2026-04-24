// Runs before any test module is loaded — sets env vars for in-memory DB and test JWT secret
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-queuecare';
