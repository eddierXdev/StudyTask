const app = require('./app');
const environment = require('./config/environment');

const host = process.env.HOST || process.env.IP;
const displayHost = host || 'localhost';

function onListening() {
  console.log(
    `StudyTask listening on http://${displayHost}:${environment.port} (${environment.nodeEnv})`
  );
}

const server = host
  ? app.listen(environment.port, host, onListening)
  : app.listen(environment.port, onListening);

server.on('error', (error) => {
  console.error(`Server error: ${error.message}`);
  process.exitCode = 1;
});

module.exports = server;
