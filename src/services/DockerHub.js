const axios = require('axios')
const cache = require('../utils/cache')
const DockerCredentialsService = require('./DockerCredentialsService')

const credentialsService = new DockerCredentialsService();

const getAccessToken = async (username,pat) => {
    try {
        if (!username) {
            throw new Error('Username is required to get Docker Hub access token');
        }
        
        // Get credentials from database
        const userExists = await credentialsService.ifUserExists(username,pat);
        if (!userExists) {
            throw new Error(`No Docker credentials found for user: ${username}. Please save credentials first.`);
        }
        else{
            const credentials = await credentialsService.getCredentials(username);
        }
        
        const response = await axios.post('https://hub.docker.com/v2/auth/token', {
            identifier: username,
            secret: credentials.pat
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        })
        
        return response.data.access_token
    } catch (error) {
        console.error('Error getting Docker Hub access token:', error.message)
        throw error
    }
}

const getRegistryToken = async (scope, username, pat) => {
    const url = `https://auth.docker.io/token?service=registry.docker.io&scope=${scope}`;
    const cacheKey = `registryToken:${scope}:${username}:${pat}`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for registry token');
        return cached;
    }
    
    const headers = {};
   
    if (username && pat) {
      const credentials = Buffer.from(`${username}:${pat}`).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    try {
      const response = await axios.get(url, { headers });
      cache.set(cacheKey, response.data.access_token, 240000);
      return response.data.access_token;
    } catch (error) {
      console.error('Error getting registry token:', error.message);
      throw error;
    }
}

const validateCredentials = async (username, pat) => {
    const userExists = await credentialsService.ifUserExists(username.trim(), pat.trim());
    if (!userExists) {
        throw new Error(`No Docker credentials found for user: ${username}. Please save credentials first.`);
    }
    return true;
}

const getImages = async (query, limit = 5, page = 1, pat=null) => {
    const cacheKey = `images:${query}:${limit}:${page}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for images search');
        return cached;
    }

    try {
        const response = await axios.get('https://hub.docker.com/v2/search/repositories/', {
            params: {
                query: query,
                page: page,
                page_size: limit
            },
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pat ? `Bearer ${pat}` : null
            }
        })
        
        if (!response.data || !response.data.results) {
            throw new Error('Invalid response structure from Docker Hub API');
        }
        
        cache.set(cacheKey, response.data.results, 600000);
        
        return response.data.results
    } catch (error) {
        console.error('Error searching Docker Hub images:', error.message)
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
        throw error
    }
}

const getImageDetails = async (imageName, isOffical=false, pat=null) => {
    const cacheKey = `details:${isOffical ? 'library/' : ''}${imageName}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for image details');
        return cached;
    }

    try {
        const response = await axios.get(`https://hub.docker.com/v2/repositories/${isOffical ? 'library/' : ''}${imageName}`, {
            headers: {
                'Authorization': pat ? `Bearer ${pat}` : null
            }
        })
        const data = { ...response.data };
        delete data.full_description;
        delete data.media_types;
        delete data.hub_user;
        
        cache.set(cacheKey, data, 3600000);
        
        return data;
    } catch (error) {
        console.error('Error getting Docker Hub image details:', error.message)
        throw error
    }
}

const getImageTags = async (imageName, isOffical=false, page=1, limit=2, pat=null) => {
    const cacheKey = `tags:${isOffical ? 'library/' : ''}${imageName}:${page}:${limit}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for image tags');
        return cached;
    }

    try {
        const response = await axios.get(`https://hub.docker.com/v2/repositories/${isOffical ? 'library/' : ''}${imageName}/tags`, {
            params: {
                page: page,
                page_size: limit
            },
            headers: {
                'Authorization': pat ? `Bearer ${pat}` : null
            }
        })
        
        cache.set(cacheKey, response.data.results, 1800000);
        
        return response.data.results;
    } catch (error) {
        console.error('Error getting Docker Hub image tags:', error.message)
        throw error
    }
}

const getImageManifest = async (imageName, isOffical=false, tag, username, pat) => {
    const cacheKey = `manifest:${isOffical ? 'library/' : ''}${imageName}:${tag}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for image manifest');
        return cached;
    }

    try {
        const token = await getRegistryToken(`repository:${isOffical ? 'library/' : ''}${imageName}:pull`, username, pat);
        const response2 = await axios.get(`https://registry-1.docker.io/v2/${isOffical ? 'library/' : ''}${imageName}/manifests/${tag}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const result = response2.data?.manifests || response2.data?.layers;
        
        // Cache for 1 hour (manifests rarely change)
        cache.set(cacheKey, result, 3600000);
        
        return result;
    } catch (error) {
        console.error('Error getting Docker Hub image manifest:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
        }
        throw error;
    }
}

const getImageTagDetails = async (imageName, isOffical=false, tag, pat=null) => {
    const cacheKey = `tagDetails:${isOffical ? 'library/' : ''}${imageName}:${tag}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for image tag details');
        return cached;
    }

    try {
        const response = await axios.get(`https://hub.docker.com/v2/repositories/${isOffical ? 'library/' : ''}${imageName}/tags/${tag}`, {
            headers: {
                'Authorization': pat ? `Bearer ${pat}` : null
            }
        })
        console.log(response.data)
        
        // Cache for 30 minutes
        cache.set(cacheKey, response.data, 1800000);
        
        return response.data;
    } catch (error) {
        console.error('Error getting Docker Hub image tag details:', error.message)
        throw error
    }
}

const getAllRepositories = async (username, pat=null) => {
    const cacheKey = `repos:${username}`;
    
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('Cache hit for repositories');
        return cached;
    }

    try {
        const response = await axios.get(`https://hub.docker.com/v2/repositories/${username}`, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': pat ? `Bearer ${pat}` : null
            }
        })
        
        cache.set(cacheKey, response.data.results, 7200000);
        
        return response.data.results;
    } catch (error) {
        console.error('Error getting repositories:', error.message)
        throw error
    }
}

module.exports = {
    getAccessToken,
    getImages,
    getImageDetails,
    getImageManifest,
    getImageTags,
    getImageTagDetails,
    getAllRepositories,
    getRegistryToken,
    validateCredentials
}