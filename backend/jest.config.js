module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 15000
};

process.env.JWT_SECRET = 'secret'
