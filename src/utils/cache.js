class Cache {
    constructor() {
        this.cache = new Map();
    }

    set(key, value, ttlMs = 300000) { // Default 5 minutes
        const expiry = Date.now() + ttlMs;
        this.cache.set(key, { value, expiry });
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;
        
        if (Date.now() > item.expiry) {
            this.cache.delete(key);
            return null;
        }
        
        return item.value;
    }

    clear() {
        this.cache.clear();
    }

    // Clean up expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, item] of this.cache.entries()) {
            if (now > item.expiry) {
                this.cache.delete(key);
            }
        }
    }
}

// Create a singleton instance
const cache = new Cache();

// Clean up expired entries every 5 minutes
setInterval(() => cache.cleanup(), 300000);

module.exports = cache;