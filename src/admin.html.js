export const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>2D3D Pro SaaS Admin</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://unpkg.com/alpinejs@3.x.x/dist/cdn.min.js" defer></script>
    <style>
        body { background-color: #0f172a; color: white; font-family: sans-serif; }
        .glass {
            background: rgba(30, 41, 59, 0.7);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        [x-cloak] { display: none !important; }
    </style>
</head>
<body x-data="app()" x-init="fetchClients()">

    <nav class="glass sticky top-0 z-50 p-4 flex justify-between items-center">
        <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            🤖 2D3D SaaS Manager
        </h1>
        <button @click="showAddModal = true" class="bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg text-sm font-semibold transition shadow-lg shadow-blue-500/30">
            + New Client
        </button>
    </nav>

    <main class="p-4 max-w-7xl mx-auto space-y-6">
        
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <template x-for="stat in stats">
                <div class="glass p-4 rounded-xl">
                    <p class="text-gray-400 text-xs uppercase" x-text="stat.label"></p>
                    <p class="text-2xl font-bold mt-1" x-text="stat.value"></p>
                </div>
            </template>
        </div>

        <div class="glass p-4 rounded-xl space-y-2">
            <h3 class="font-semibold text-lg">📢 Global Broadcast</h3>
            <div class="flex gap-2">
                <input x-model="broadcastMsg" type="text" placeholder="Send message to all authorized users..." class="w-full bg-slate-800 border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-500">
                <button @click="sendBroadcast()" :disabled="sending" class="bg-emerald-600 px-6 rounded-lg font-bold disabled:opacity-50">
                    Send
                </button>
            </div>
        </div>

        <div class="space-y-4">
            <template x-for="client in clients" :key="client.id">
                <div class="glass p-5 rounded-xl transition hover:bg-slate-800/50">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h3 class="font-bold text-lg text-white" x-text="client.name"></h3>
                            <div class="flex items-center gap-3 text-sm text-gray-400 mt-1">
                                <span class="bg-slate-700 px-2 py-0.5 rounded text-xs" x-text="'ID: ' + client.id"></span>
                                <span class="text-emerald-400 font-mono" x-text="client.credits + ' pts'"></span>
                                <span x-text="'Comm: ' + client.commission_rate + '%'"></span>
                            </div>
                            <div class="mt-2 text-xs text-gray-500 break-all font-mono select-all" x-text="client.bot_token"></div>
                        </div>

                        <div class="flex flex-wrap gap-2 w-full md:w-auto">
                            <button @click="topUp(client.id)" class="flex-1 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-3 py-2 rounded-lg text-sm hover:bg-indigo-600/40">
                                💰 Top Up
                            </button>
                            <button @click="updateComm(client.id, client.commission_rate)" class="flex-1 bg-slate-700/50 border border-slate-600 px-3 py-2 rounded-lg text-sm hover:bg-slate-700">
                                ⚙️ Edit
                            </button>
                             <button @click="setWebhook(client.bot_token)" class="flex-1 bg-orange-600/20 text-orange-300 border border-orange-500/30 px-3 py-2 rounded-lg text-sm hover:bg-orange-600/40">
                                🔗 Webhook
                            </button>
                        </div>
                    </div>
                </div>
            </template>
        </div>
    </main>

    <div x-show="showAddModal" x-cloak class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" @click.self="showAddModal = false">
        <div class="glass p-6 rounded-xl w-full max-w-md mx-4 space-y-4 bg-slate-900">
            <h2 class="text-xl font-bold">Add New Client</h2>
            
            <div>
                <label class="block text-sm text-gray-400 mb-1">Client Name</label>
                <input x-model="newClient.name" type="text" class="w-full bg-slate-800 rounded p-2 text-white border border-slate-700 focus:border-blue-500 focus:outline-none">
            </div>

            <div>
                <label class="block text-sm text-gray-400 mb-1">Bot Token</label>
                <input x-model="newClient.token" type="text" placeholder="12345:ABC..." class="w-full bg-slate-800 rounded p-2 text-white border border-slate-700 focus:border-blue-500 focus:outline-none">
            </div>

            <div class="flex gap-3 pt-2">
                <button @click="showAddModal = false" class="flex-1 px-4 py-2 rounded bg-slate-700 hover:bg-slate-600">Cancel</button>
                <button @click="createClient()" :disabled="!newClient.name || !newClient.token" class="flex-1 px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50">Create</button>
            </div>
        </div>
    </div>

    <script>
        function app() {
            return {
                clients: [],
                stats: [
                    { label: 'Total Clients', value: 0 },
                    { label: 'Active Users', value: 0 },
                    { label: 'Total Usage', value: 0 },
                    { label: 'System Health', value: '100%' }
                ],
                broadcastMsg: '',
                sending: false,
                adminKey: '',
                showAddModal: false,
                newClient: { name: '', token: '' },

                async fetchClients() {
                    const key = localStorage.getItem('adminKey') || prompt("Enter Admin Password:");
                    if(!key) return;
                    this.adminKey = key;
                    localStorage.setItem('adminKey', key);
                    
                    try {
                        const res = await fetch('/api/clients', { headers: { 'X-Admin-Key': this.adminKey } });
                        if(res.status === 401) {
                            localStorage.removeItem('adminKey');
                            alert("Invalid Password");
                            location.reload();
                            return;
                        }
                        const data = await res.json();
                        this.clients = data.clients;
                        this.stats[0].value = data.clients.length;
                    } catch(e) { console.error(e); }
                },

                async createClient() {
                    if(!this.newClient.name || !this.newClient.token) return;
                    
                    await fetch('/api/create-client', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': this.adminKey },
                        body: JSON.stringify(this.newClient)
                    });
                    
                    this.showAddModal = false;
                    this.newClient = { name: '', token: '' };
                    this.fetchClients();
                },
                
                async topUp(id) {
                    const amount = prompt("Add Credits (e.g., 1000):");
                    if(!amount) return;
                    await fetch('/api/topup', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': this.adminKey },
                        body: JSON.stringify({ id, amount: parseInt(amount) })
                    });
                    this.fetchClients();
                },

                async updateComm(id, current) {
                    const rate = prompt("New Commission %:", current);
                    if(!rate) return;
                    await fetch('/api/commission', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': this.adminKey },
                        body: JSON.stringify({ id, rate: parseFloat(rate) })
                    });
                    this.fetchClients();
                },
                
                async setWebhook(token) {
                    const res = await fetch('/api/webhook-link', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Admin-Key': this.adminKey },
                        body: JSON.stringify({ token })
                    });
                    alert(await res.text());
                },

                async sendBroadcast() {
                    if(!this.broadcastMsg) return;
                    this.sending = true;
                    await fetch('/api/broadcast', {
                        method: 'POST',
                         headers: { 'Content-Type': 'application/json', 'X-Admin-Key': this.adminKey },
                         body: JSON.stringify({ message: this.broadcastMsg })
                    });
                    alert("Sent!");
                    this.broadcastMsg = '';
                    this.sending = false;
                }
            }
        }
    </script>
</body>
</html>
`;
