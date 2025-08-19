# MCP Docker Hub Server

A Model Context Protocol (MCP) server that provides access to Docker Hub functionality through Claude with secure database storage for credentials.

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Database Setup:**
   - Create a MySQL/MariaDB database
   - Run the SQL commands in `DATABASE_SETUP.md`
   - See `config.example` for environment variables

3. **Create environment variables:**
   Create a `.env` file in the root directory with:
   ```
   # Database Configuration
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=your_password_here
   DB_NAME=docker_hub_db
   DB_PORT=3306
   
   # Encryption Key (32 characters recommended)
   ENCRYPTION_KEY=your-secret-encryption-key-32-chars-long
   ```
   
   To get your Docker Hub access token:
   - Go to https://hub.docker.com/settings/security
   - Create a new access token
   - Use the `docker_save_credentials` tool to store securely

4. **Run the server:**
   ```bash
   node src/index.js
   ```

## Features

### Docker Hub Operations
- **docker_search_images**: Search for Docker images on Docker Hub
  - Parameters:
    - `username` (required): Docker Hub username
    - `query` (required): Search term
    - `limit` (optional): Number of results (default: 5)
    - `page` (optional): Page number (default: 1)

- **docker_get_image_details**: Get details of a particular image
- **docker_list_tags**: List tags for a specific image
- **docker_get_manifest**: Get image manifest
- **docker_analyze_layers**: Analyze image layers

### Credential Management
- **docker_save_credentials**: Save or update Docker Hub credentials securely
- **docker_get_credentials**: Get credential metadata (username, dates)
- **docker_list_credentials**: List all active credentials
- **docker_delete_credentials**: Delete credentials for a user
- **docker_test_db_connection**: Test database connectivity

## Troubleshooting

### EPIPE Error
If you encounter `Error: write EPIPE`, this usually means:
1. The MCP client (Claude) closed the connection unexpectedly
2. There's a communication issue between the client and server

**Solutions:**
1. Restart Claude
2. Check that your environment variables are set correctly
3. Ensure the server is running before opening Claude
4. Check the console output for any error messages

### Common Issues
1. **Database connection failed**: Check database server and credentials in `.env`
2. **Missing encryption key**: Ensure `ENCRYPTION_KEY` is set in `.env`
3. **Invalid credentials**: Use `docker_save_credentials` to store valid credentials
4. **Network issues**: Check your internet connection and Docker Hub API status
5. **Table not found**: Run the SQL commands in `DATABASE_SETUP.md`

## Development

The server is built using:
- Node.js
- MCP SDK (@modelcontextprotocol/sdk)
- Axios for HTTP requests
- MySQL2 for database connectivity
- CryptoJS for encryption
- Dotenv for environment variable management

## Security

- All Docker Hub Personal Access Tokens (PATs) are encrypted using AES-256 encryption
- Credentials are stored securely in the database
- No sensitive data is exposed through the MCP tools
- Soft delete ensures data recovery capability

## Logs

The server provides detailed logging for debugging:
- MCP Server errors
- Transport errors
- Docker Hub API errors
- Process signals and shutdown events
