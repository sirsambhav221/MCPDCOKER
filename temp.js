const DockerCredentialsService = require('./src/services/DockerCredentialsService')
const { decrypt } = require('./src/utils/encryption')
const { validateCredentials } = require('./src/services/DockerHub')

const credentialsService = new DockerCredentialsService();

async function main() {
    const isValid = await validateCredentials('saviosammy', 'dckr_pat_6yhTHj1FkXKoBNRK0vXrHzXwhI4');
    console.log(isValid);
}

main();