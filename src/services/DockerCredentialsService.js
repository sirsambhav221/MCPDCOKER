const { pool } = require('../config/database');
const { encrypt, decrypt } = require('../utils/encryption');

class DockerCredentialsService {
    
    // Save or update Docker credentials for a user
    async saveCredentials(username, pat) {
        try {
            const encryptedPat = encrypt(pat);
            
            // Check if credentials already exist for this user
            const [existingRows] = await pool.execute(
                'SELECT id FROM demo.user_docker_credentials WHERE username = ? AND is_active = 1',
                [username]
            );
            
            if (existingRows.length > 0) {
                // Update existing credentials
                const [result] = await pool.execute(
                    'UPDATE demo.user_docker_credentials SET encrypted_pat = ?, updated_at = NOW() WHERE username = ? AND is_active = 1',
                    [encryptedPat, username]
                );
                console.log(`Updated Docker credentials for user: ${username}`);
                return { success: true, message: 'Credentials updated successfully', updated: true };
            } else {
                // Insert new credentials
                const [result] = await pool.execute(
                    'INSERT INTO demo.user_docker_credentials (username, encrypted_pat) VALUES (?, ?)',
                    [username, encryptedPat]
                );
                console.log(`Saved new Docker credentials for user: ${username}`);
                return { success: true, message: 'Credentials saved successfully', updated: false };
            }
        } catch (error) {
            console.error('Error saving Docker credentials:', error);
            throw new Error(`Failed to save credentials: ${error.message}`);
        }
    }
    
    // Get Docker credentials for a user
    async getCredentials(username) {
        try {
            const [rows] = await pool.execute(
                'SELECT username, encrypted_pat, created_at, updated_at FROM demo.user_docker_credentials WHERE username = ? AND is_active = 1',
                [username]
            );
            
            if (rows.length === 0) {
                return null;
            }
            
            const credentials = rows[0];
            const decryptedPat = decrypt(credentials.encrypted_pat);
            
            return {
                username: credentials.username,
                pat: decryptedPat,
                created_at: credentials.created_at,
                updated_at: credentials.updated_at
            };
        } catch (error) {
            console.error('Error getting Docker credentials:', error.message);
            throw new Error(`Failed to get credentials: ${error.message}`);
        }
    }

    async ifUserExists(username, pat) {
        try {
            const [rows] = await pool.execute(
                'SELECT id, encrypted_pat FROM demo.user_docker_credentials WHERE username = ? AND is_active = 1',
                [username]
            );
            if(rows.length > 0) {
                const credentials = rows[0];
                const decryptedPat = decrypt(credentials.encrypted_pat);
                return decryptedPat === pat;
            }
            return false;
        }
        catch (error) {
            console.error('Error checking if user exists:', error.message);
            return false;
        }
    }
}

module.exports = DockerCredentialsService;
