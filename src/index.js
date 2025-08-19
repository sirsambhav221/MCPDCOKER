const { getAccessToken, getImages, getImageDetails, getImageTags, getImageManifest,getImageTagDetails, getAllRepositories, validateCredentials } = require('./services/DockerHub.js');
const { McpServer } = require("@modelcontextprotocol/sdk/server/mcp.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { z } = require("zod");

// Redirect console output to stderr to avoid interfering with MCP protocol
const log = console.log;
const error = console.error;
console.log = (...args) => process.stderr.write(args.join(' ') + '\n');
console.error = (...args) => process.stderr.write('ERROR: ' + args.join(' ') + '\n');

const server = new McpServer({
    name: "docker-hub-mcp",
    version: "1.0.0"
});

server.registerTool("docker_verify_credentials",
    {
        title: "docker_verify_credentials",
        description: "Verify Docker Hub credentials by testing authentication and saving to database if valid",
        inputSchema: {username: z.string(), pat: z.string()},
    },
    async ({ username, pat }) => {
        try {
            const isValid = await validateCredentials(username, pat);
            if (!isValid) {
                return {
                    content: [{
                        type: "text",
                        text: `Credentials verification failed: Invalid username or PAT`
                    }]
                };
            }
            return {
                content: [{
                    type: "text",
                    text: `Credentials verified successfully`
                }]
            };
        } catch (error) {
            console.error('Error in docker_verify_credentials tool:', error.message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error.message}`
                }]
            };
        }
    }
);

server.registerTool("docker_search_images",
    {
        title: "docker_search_images",
        description: "Search for images in docker hub",
        inputSchema: {query: z.string(), limit: z.number().optional(), page: z.number().optional(), pat: z.string().optional()},
    },
    async ({ query, limit, page, pat }) => {
        try {
            const images = await getImages(query, limit, page, pat);
            
            // Validate the response
            if (!images || !Array.isArray(images)) {
                return {
                    content: [{
                        type: "text",
                        text: "Error: Invalid response from Docker Hub API"
                    }]
                };
            }
            
            const imageNames = images.map(image => JSON.stringify(image) || 'Unknown');
            
            return {
                content: [{
                    type: "text",
                    text: `Found ${imageNames.length} images: ${imageNames.join(', ')}`
                }]
            };
        } catch (error) {
            console.error('Error in docker_search_images tool:', error.message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error.message}`
                }]
            };
        }
    }
);

server.registerTool("docker_get_image_details",
    {
        title: "docker_get_image_details",
        description: "Get details of a particular image in docker hub",
        inputSchema: {imageName: z.string(), isOffical: z.boolean(), pat: z.string().optional()},
    },
    async ({ imageName, isOffical, pat }) => {
        try {
            const imageDetails = await getImageDetails(imageName, isOffical, pat);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(imageDetails)
                }]
            };
        } catch (error) {
            console.error('Error in docker_get_image_details tool:', error.message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error.message}`
                }]
            };
        }
    }
)

server.registerTool("docker_list_tags",
    {
        title: "docker_list_tags",
        description: "List requested number of tags for a particular image in docker hub",
        inputSchema: {imageName: z.string(), isOffical: z.boolean(), limit: z.number().optional(), page: z.number().optional(), pat: z.string().optional()},
    },
    async ({ imageName, isOffical, limit, page, pat }) => {
        const tags = await getImageTags(imageName, isOffical, page, limit, pat);
        const tagNames = tags.map(tag => tag.name);
        try {
            return {
                content: [{
                    type: "text",
                    text: `Found ${tagNames.length} tags: ${tagNames.join(', ')}`
                }]
            };
        } catch (error) {
            console.error('Error in docker_list_tags tool:', error.message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error.message}`
                }]
            };
        }
    }
)

server.registerTool("docker_get_manifest",
    {
        title: "docker_get_manifest",
        description: "Get manifest of a particular image in docker hub",
        inputSchema: {imageName: z.string(), isOffical: z.boolean(), tag: z.string(), username: z.string(), pat: z.string().optional()},
    },
    async ({ imageName, isOffical, tag, username, pat }) => {
        try {
            const manifest = await getImageManifest(imageName, isOffical, tag, username, pat);
            const summarizedManifests = manifest.map(manifest => {
                const annotations = manifest.annotations || {};
                return {
                  digest: manifest.digest,
                  architecture: manifest.platform?.architecture || "unknown",
                  os: manifest.platform?.os || "unknown",
                  variant: manifest.platform?.variant || "",
                  size: manifest.size,
                  version: annotations["org.opencontainers.image.version"] || "N/A"
                };
              });
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(summarizedManifests)
                }]
            };
        } catch (error) {
            console.error('Error in docker_get_manifest tool:', error.message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error.message}`
                }]
            };
        }
    }
);

server.registerTool("docker_analyze_layers",
    {
        title: "docker_analyze_layers",
        description: "Analyze image layers and sizes of a particular digest and digest is obtained from docker_get_manifest tool",
        inputSchema: {imageName: z.string(), isOffical: z.boolean(), digest: z.string(), username: z.string(), pat: z.string().optional()},
    },
    async ({ imageName, isOffical, digest, username, pat }) => {
        try {
            const manifest = await getImageManifest(imageName, isOffical, digest, username, pat);
            return {
                content: [{
                    type: "text",
                    text: JSON.stringify(manifest)
                }]
            };
        } catch (error) {
            console.error('Error in docker_analyze_layers tool:', error.message);
            return {
                content: [{
                    type: "text",
                    text: `Error: ${error.message}`
                }]
            };
        }
    }
)



// Create transport
const transport = new StdioServerTransport();

// // Handle process signals gracefully
// process.on('SIGINT', () => {
//     console.log('Received SIGINT, shutting down gracefully...');
//     process.exit(0);
// });

// process.on('SIGTERM', () => {
//     console.log('Received SIGTERM, shutting down gracefully...');
//     process.exit(0);
// });

// process.on('uncaughtException', (error) => {
//     console.error('Uncaught Exception:', error);
//     process.exit(1);
// });

// process.on('unhandledRejection', (reason, promise) => {
//     console.error('Unhandled Rejection at:', promise, 'reason:', reason);
//     process.exit(1);
// });

// // Connect the server to the transport
try {
    server.connect(transport);
    console.log('MCP Server started successfully');
} catch (error) {
    console.error('Failed to start MCP Server:', error);
    process.exit(1);
}
