# Flutterwave Proxy Server

A dedicated proxy server for Flutterwave bill payments with a static IP for whitelisting.

## Purpose

This server provides a static IP address that can be whitelisted with Flutterwave, allowing your Musa app to process electricity bill payments securely.

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health check |
| `/verify-ip` | GET | Returns the server's outbound IP |
| `/bill` | POST | Create bill payment (with retry logic) |
| `/bill-status/:flwRef` | GET | Check bill payment status |
| `/bill-categories` | GET | Get biller categories |
| `/validate-bill` | POST | Validate meter/customer |

## Deployment to DigitalOcean

### 1. Create Droplet

1. Go to [DigitalOcean](https://cloud.digitalocean.com)
2. Click "Create" → "Droplets"
3. Choose:
   - **OS**: Ubuntu 22.04 (LTS) x64
   - **Plan**: Basic ($6/month - 512MB RAM, 1 vCPU)
   - **Region**: Choose closest to your users (e.g., London for UK, Frankfurt for Europe)
   - **SSH Key**: Add the `musa_droplet` key
4. Create droplet and note the IP address

### 2. Add SSH Key to DigitalOcean

**Public Key** (copy this to DigitalOcean):
```
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGDqfvke7AT49gdKHorglLiFQ04JIhsagcCMXHSgbMoi musa-deploy
```

1. In DigitalOcean, go to Settings → Security → SSH Keys
2. Click "Add SSH Key"
3. Paste the public key above
4. Name it "musa-droplet-key"

### 3. SSH into Droplet

```bash
ssh -i ~/.ssh/musa_droplet root@YOUR_DROPLET_IP
```

### 4. Setup Server

Once SSH'd in, run:

```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/musa-app/main/flw-proxy/deploy.sh | bash
```

Or manually:

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/flw-proxy
sudo chown -R $USER:$USER /var/www/flw-proxy
cd /var/www/flw-proxy

# Copy files (from local machine)
# On local machine:
# scp -i ~/.ssh/musa_droplet -r flw-proxy/* root@YOUR_DROPLET_IP:/var/www/flw-proxy/

# Install dependencies
npm install

# Create .env file
nano .env
# Add your FLUTTERWAVE_SECRET_KEY and PROXY_SECRET

# Start with PM2
pm2 start index.js --name "flw-proxy"
pm2 save
pm2 startup
```

### 5. Configure Environment Variables

On the droplet:

```bash
cd /var/www/flw-proxy
nano .env
```

Add:
```
FLUTTERWAVE_SECRET_KEY=FLWSECK_test_xxxxxxxxxxxxxxxxxxxx
PROXY_SECRET=your_random_secret_here
PORT=8080
```

### 6. Get Static IP for Flutterwave

```bash
curl http://YOUR_DROPLET_IP:8080/verify-ip
```

This IP is what you'll whitelist in Flutterwave Dashboard.

## Whitelist IP in Flutterwave

1. Login to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Go to Settings → API Keys → IP Whitelist
3. Add your droplet's IP address

## Update Your Main App

Add the proxy URL to your main app's environment:

```env
FLW_PROXY_URL=http://YOUR_DROPLET_IP:8080
FLW_PROXY_SECRET=your_random_secret_here
```

## Monitoring

```bash
# Check proxy status
pm2 status

# View logs
pm2 logs flw-proxy

# Restart
pm2 restart flw-proxy
```

## Security

- Firewall only allows port 8080 and SSH
- Proxy requires `X-Proxy-Secret` header
- All Flutterwave API calls use HTTPS

## Troubleshooting

**Can't SSH into droplet:**
```bash
# Make sure permissions are correct
chmod 600 ~/.ssh/musa_droplet
```

**Proxy not responding:**
```bash
# Check if running
pm2 status

# Check firewall
sudo ufw status

# Check logs
pm2 logs
```

**IP not whitelisted:**
```bash
# Verify your IP
curl http://YOUR_DROPLET_IP:8080/verify-ip
```
