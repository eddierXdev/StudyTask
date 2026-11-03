const app = require('./app');
const environment = require('./config/environment');

const server = app.listen(environment.port, () => {
  console.log(
    `StudyTask listening on http://localhost:${environment.port} (${environment.nodeEnv})`
  );
});

server.on('error', (error) => {
  console.error(`Server error: ${error.message}`);
  process.exitCode = 1;
});

module.exports = server;
