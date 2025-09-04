const { chromium } = require('playwright');

class ixBrowserProfileManager {
    constructor() {
        this.baseUrl = 'http://127.0.0.1:30000'; // Default ixBrowser local API port
        this.apiKey = process.env.IXBROWSER_API_KEY || 'your-api-key-here';
    }

    /**
     * Make HTTP request to ixBrowser API
     */
    async makeApiRequest(endpoint, method = 'GET', body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}` // If API key authentication is required
            }
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
        } catch (error) {
            console.error(`API request failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Get all opened profiles from ixBrowser
     */
    async getOpenedProfiles() {
        try {
            console.log('Fetching opened profiles from ixBrowser...');
            
            // According to ixBrowser API documentation, this endpoint gets opened profiles
            const response = await this.makeApiRequest('/api/v2/browser/opened');
            
            if (response.code === 200 && response.data) {
                console.log(`Found ${response.data.length} opened profile(s)`);
                return response.data;
            } else {
                console.log('No opened profiles found or API error');
                return [];
            }
        } catch (error) {
            console.error('Error fetching opened profiles:', error);
            return [];
        }
    }

    /**
     * Get detailed information about all profiles (both opened and closed)
     */
    async getAllProfiles() {
        try {
            console.log('Fetching all profiles from ixBrowser...');
            
            const response = await this.makeApiRequest('/api/v2/browser/list');
            
            if (response.code === 200 && response.data) {
                console.log(`Found ${response.data.length} total profile(s)`);
                return response.data;
            } else {
                console.log('No profiles found or API error');
                return [];
            }
        } catch (error) {
            console.error('Error fetching all profiles:', error);
            return [];
        }
    }

    /**
     * Connect to an opened profile using Playwright
     */
    async connectToProfile(profileId) {
        try {
            console.log(`Connecting to profile: ${profileId}`);
            
            // Get profile connection details
            const response = await this.makeApiRequest(`/api/v2/browser/connect/${profileId}`);
            
            if (response.code === 200 && response.data) {
                const { ws_endpoint, user_data_dir } = response.data;
                
                // Connect using Playwright
                const browser = await chromium.connectOverCDP(ws_endpoint);
                const context = browser.contexts()[0];
                const page = await context.newPage();
                
                return { browser, context, page, profileData: response.data };
            } else {
                throw new Error(`Failed to connect to profile ${profileId}`);
            }
        } catch (error) {
            console.error(`Error connecting to profile ${profileId}:`, error);
            throw error;
        }
    }

    /**
     * Display opened profiles information in a formatted way
     */
    displayProfilesInfo(profiles) {
        if (profiles.length === 0) {
            console.log('\n📭 No opened profiles found');
            return;
        }

        console.log('\n🔍 Opened Profiles:');
        console.log('=' .repeat(80));
        
        profiles.forEach((profile, index) => {
            console.log(`\n${index + 1}. Profile ID: ${profile.profile_id || profile.id}`);
            console.log(`   Name: ${profile.name || 'Unknown'}`);
            console.log(`   Status: ${profile.status || 'Unknown'}`);
            console.log(`   User Agent: ${profile.user_agent || 'Default'}`);
            console.log(`   Proxy: ${profile.proxy ? `${profile.proxy.type}://${profile.proxy.host}:${profile.proxy.port}` : 'None'}`);
            console.log(`   Created: ${profile.created_time || 'Unknown'}`);
            console.log(`   WebSocket: ${profile.ws_endpoint || 'N/A'}`);
        });
    }

    /**
     * Main execution function
     */
    async run() {
        try {
            console.log('🚀 Starting ixBrowser Profile Manager\n');
            
            // Get opened profiles
            const openedProfiles = await this.getOpenedProfiles();
            
            // Display the information
            this.displayProfilesInfo(openedProfiles);
            
            // Optional: Also show all profiles with their status
            console.log('\n' + '='.repeat(80));
            console.log('📋 All Profiles Status:');
            
            const allProfiles = await this.getAllProfiles();
            allProfiles.forEach(profile => {
                const isOpened = openedProfiles.some(op => op.profile_id === profile.profile_id);
                console.log(`${isOpened ? '🟢' : '🔴'} ${profile.name || profile.profile_id} - ${isOpened ? 'OPENED' : 'CLOSED'}`);
            });
            
            return {
                openedProfiles,
                allProfiles
            };
            
        } catch (error) {
            console.error('❌ Script execution failed:', error);
            process.exit(1);
        }
    }
    /**
     * Main execution function
     */
    async run() {
        try {
            console.log('🚀 Starting ixBrowser Profile Manager\n');
            
            // Get opened profiles
            const openedProfiles = await this.getOpenedProfiles();
            
            // Display the information
            this.displayProfilesInfo(openedProfiles);
            
            // Optional: Also show all profiles with their status
            console.log('\n' + '='.repeat(80));
            console.log('📋 All Profiles Status:');
            
            const allProfiles = await this.getAllProfiles();
            allProfiles.forEach(profile => {
                const isOpened = openedProfiles.some(op => op.profile_id === profile.profile_id);
                console.log(`${isOpened ? '🟢' : '🔴'} ${profile.name || profile.profile_id} - ${isOpened ? 'OPENED' : 'CLOSED'}`);
            });
            
            return {
                openedProfiles,
                allProfiles
            };
            
        } catch (error) {
            console.error('❌ Script execution failed:', error);
            process.exit(1);
        }
    }
}

// Main execution function
async function main() {
    const profileManager = new ixBrowserProfileManager();
    
    try {
        // Run automation on ALL opened profiles in parallel using Promise.allSettled
        const { results, summary } = await profileManager.runAllProfilesInParallel(180000); // 3 minute timeout
        
        console.log('\n🎉 All parallel automations completed!');
        console.log(`📈 Success rate: ${summary.successRate}%`);
        
        // Access results if needed
        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length > 0) {
            console.log(`\n✅ Successfully processed ${successfulResults.length} profiles`);
        }
        
        const failedResults = results.filter(r => !r.success);
        if (failedResults.length > 0) {
            console.log(`\n❌ Failed profiles: ${failedResults.length}`);
            failedResults.forEach(result => {
                console.log(`   - ${result.profileName}: ${result.error}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Main execution failed:', error);
        process.exit(1);
    }
}

// Run the script if this file is executed directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = ixBrowserProfileManager;
