import { logError } from '../src/utils/logger.js';

function run() {
  try {
    throw new Error('Test error for logger');
  } catch (err) {
    logError(err, 'Test logError invocation', { extra: 'value' });
  }
}

run();
