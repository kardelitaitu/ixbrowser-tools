// Jest setup file for global test configuration
import 'dotenv/config';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.BASE_URL = 'http://localhost:3000';
process.env.IXBROWSER_API_KEY = 'test-api-key';

// Mock external dependencies that might not be available in test environment
jest.mock('playwright', () => ({
  chromium: {
    connectOverCDP: jest.fn(),
  },
}));

// Declare global test utilities type
declare global {
  var testUtils: {
    wait: (ms: number) => Promise<void>;
    mockBrowser: () => {
      contexts: () => any[];
      newPage: jest.MockedFunction<any>;
      close: jest.MockedFunction<any>;
    };
    mockPage: () => {
      addInitScript: jest.MockedFunction<any>;
      route: jest.MockedFunction<any>;
      close: jest.MockedFunction<any>;
    };
  };
}

// Global test utilities
global.testUtils = {
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
  mockBrowser: () => ({
    contexts: () => [{}],
    newPage: jest.fn(),
    close: jest.fn(),
  }),
  mockPage: () => ({
    addInitScript: jest.fn(),
    route: jest.fn(),
    close: jest.fn(),
  }),
};