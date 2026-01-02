export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest'
    },
    moduleFileExtensions: ['js'],
    testMatch: ['**/tests/**/*.test.js'],
    verbose: true,
    collectCoverageFrom: ['src/**/*.js'],
    coverageDirectory: 'coverage'
};
