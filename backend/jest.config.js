module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 15000,
  collectCoverage: true
};

process.env.JWT_SECRET = 'secret'
process.env.LOG_LEVEL = 'fatal'
