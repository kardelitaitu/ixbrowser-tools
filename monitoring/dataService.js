import si from 'systeminformation';
const LOGS_DIR = '../logs';
const PROJECT_ROOT = '../';
export class DataService {
    static instance;
    static getInstance() {
        if (!DataService.instance) {
            DataService.instance = new DataService();
        }
        return DataService.instance;
    }
    async getProfilesData() {
        // Read from logs/audit_*.jsonl for profile data
        try {
            const fs = await import('fs').then(m => m.promises);
            const files = await fs.readdir(LOGS_DIR);
            const auditFiles = files.filter(f => f.startsWith('audit_') && f.endsWith('.jsonl'));
            const profiles = [];
            const profileMap = new Map();
            for (const file of auditFiles) {
                const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8');
                const lines = content.trim().split('\n');
                for (const line of lines) {
                    try {
                        const entry = JSON.parse(line);
                        if (entry.profileId) {
                            const profileId = entry.profileId;
                            if (!profileMap.has(profileId)) {
                                profileMap.set(profileId, {
                                    profileId,
                                    profileName: entry.profileName || `Profile-${profileId}`,
                                    status: 'idle',
                                    startTime: new Date(entry.timestamp).getTime(),
                                    metrics: {}
                                });
                            }
                            const profile = profileMap.get(profileId);
                            // Update profile status based on step
                            if (entry.step === 'profile' && entry.action === 'automation_run_start') {
                                profile.status = 'running';
                            }
                            else if (entry.step === 'profile' && entry.action === 'automation_run_end') {
                                profile.status = entry.success ? 'completed' : 'failed';
                                profile.error = entry.error;
                                if (entry.duration) {
                                    profile.duration = entry.duration;
                                }
                            }
                        }
                    }
                    catch (e) {
                        // Skip invalid lines
                    }
                }
            }
            return Array.from(profileMap.values());
        }
        catch (error) {
            console.error('Error reading profile data:', error);
            return [];
        }
    }
    async getLogs() {
        // Read from logs/*.log for general logs
        try {
            const fs = await import('fs').then(m => m.promises);
            const files = await fs.readdir(LOGS_DIR);
            const logFiles = files.filter(f => f.endsWith('.log'));
            const logs = [];
            for (const file of logFiles) {
                const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8');
                const lines = content.split('\n');
                for (const line of lines.slice(-50)) { // Last 50 lines
                    if (line.trim()) {
                        const match = line.match(/\[([^\]]+)\] \[([^\]]+)\] (.+)/);
                        if (match) {
                            logs.push({
                                timestamp: match[1],
                                level: match[2],
                                message: match[3]
                            });
                        }
                    }
                }
            }
            return logs.slice(-100); // Last 100 entries
        }
        catch (error) {
            console.error('Error reading logs:', error);
            return [];
        }
    }
    async getSystemMetrics() {
        try {
            // Real CPU usage
            const cpu = await si.cpu();
            const cpuUsage = cpu.usage || 0;
            // Real RAM usage
            const mem = await si.mem();
            const totalMemory = Math.round(mem.total / (1024 ** 3)); // GB
            const usedMemory = Math.round((mem.total - mem.available) / (1024 ** 3)); // GB
            // Storage for C: drive
            const disks = await si.fsSize();
            const cDrive = disks.find(d => d.mount === 'C:' || d.mount.startsWith('C:'));
            const storageUsage = cDrive ? Math.round((cDrive.used / cDrive.size) * 100) : 0;
            // Internet download speed (Mbps)
            const network = await si.networkStats();
            const downloadSpeed = network.length > 0 ? Math.round(network[0].rx_sec / (1024 * 1024) * 8) : 0; // Mbps
            return {
                timestamp: Date.now(),
                totalMemory,
                usedMemory,
                cpuUsage: Math.round(cpuUsage),
                storageUsage,
                downloadSpeed
            };
        }
        catch (error) {
            console.error('Error fetching system metrics:', error);
            // Fallback to static values
            return {
                timestamp: Date.now(),
                totalMemory: 16,
                usedMemory: 8,
                cpuUsage: 45,
                storageUsage: 50,
                downloadSpeed: 10
            };
        }
    }
    async getTaskProgress() {
        // Parse audit logs for current task progress
        try {
            const fs = await import('fs').then(m => m.promises);
            const files = await fs.readdir(LOGS_DIR);
            const auditFiles = files.filter(f => f.startsWith('audit_') && f.endsWith('.jsonl'));
            const taskProgress = {};
            for (const file of auditFiles) {
                const content = await fs.readFile(`${LOGS_DIR}/${file}`, 'utf-8');
                const lines = content.trim().split('\n');
                // Process lines in reverse order to get latest progress
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const entry = JSON.parse(lines[i]);
                        if (entry.profileId && entry.step && entry.step !== 'profile') {
                            const profileId = entry.profileId;
                            if (!taskProgress[profileId]) {
                                taskProgress[profileId] = {
                                    taskType: entry.step,
                                    currentAction: entry.action.replace('_start', '').replace('_end', ''),
                                    progress: this.calculateProgress(entry.step, entry.action),
                                    status: this.mapActionToStatus(entry.step, entry.action),
                                    data: entry.data || {},
                                    startTime: new Date(entry.timestamp).getTime(),
                                };
                                // If this is an end action, mark as completed
                                if (entry.action.endsWith('_end')) {
                                    taskProgress[profileId].status = entry.success ? 'completed' : 'failed';
                                    if (entry.duration) {
                                        taskProgress[profileId].duration = entry.duration;
                                    }
                                }
                            }
                        }
                    }
                    catch (e) {
                        // Skip invalid lines
                    }
                }
            }
            return taskProgress;
        }
        catch (error) {
            console.error('Error reading task progress:', error);
            return {};
        }
    }
    calculateProgress(step, action) {
        const progressMap = {
            'task_read_gmail': {
                'gmail_read_execution_start': 0,
                'navigate_inbox': 10,
                'verify_login': 20,
                'find_first_mail': 40,
                'click_first_mail': 60,
                'simulate_reading': 80,
                'gmail_read_execution_end': 100,
            },
            'task_follow': {
                'follow_execution_start': 0,
                'navigate_profile': 10,
                'scroll_reveal': 20,
                'like_first_tweet': 40,
                'find_follow_button': 60,
                'click_follow_button': 80,
                'follow_execution_end': 100,
            },
            'task_join_discord': {
                'discord_join_start': 0,
                'navigate_invite': 25,
                'accept_invite': 50,
                'join_server': 75,
                'verify_join': 100,
            }
        };
        return progressMap[step]?.[action] || 0;
    }
    mapActionToStatus(step, action) {
        const statusMap = {
            'gmail_read_execution_start': 'starting',
            'navigate_inbox': 'navigating',
            'verify_login': 'verifying',
            'find_first_mail': 'clicking',
            'click_first_mail': 'clicking',
            'simulate_reading': 'reading',
            'follow_execution_start': 'starting',
            'navigate_profile': 'navigating',
            'scroll_reveal': 'waiting',
            'like_first_tweet': 'clicking',
            'find_follow_button': 'clicking',
            'click_follow_button': 'clicking',
            'discord_join_start': 'starting',
            'navigate_invite': 'navigating',
            'accept_invite': 'clicking',
            'join_server': 'clicking',
            'verify_join': 'verifying',
        };
        return statusMap[action] || 'waiting';
    }
    async getAllData() {
        const [profiles, logs, systemMetrics, taskProgress] = await Promise.all([
            this.getProfilesData(),
            this.getLogs(),
            this.getSystemMetrics(),
            this.getTaskProgress()
        ]);
        return { profiles, logs, systemMetrics, taskProgress };
    }
}
