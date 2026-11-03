'use strict';

// Run the integration suite with production cookie and security settings.
process.env.NODE_ENV = 'production';

require('./integration');
