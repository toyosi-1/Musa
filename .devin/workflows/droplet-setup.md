---
description: Setup DigitalOcean droplet for Flutterwave proxy
---

# DigitalOcean Droplet Setup for Flutterwave Proxy

## Step 1: Add SSH Key to DigitalOcean

1. Login to [DigitalOcean](https://cloud.digitalocean.com)
2. Go to **Settings** → **Security** → **SSH Keys**
3. Click **"Add SSH Key"**
4. Paste this public key:
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGDqfvke7AT49gdKHorglLiFQ04JIhsagcCMXHSgbMoi musa-deploy
   ```
5. Name it: `musa-droplet-key`

## Step 2: Create Droplet

1. Click **"Create"** → **"Droplets"**
2. Configure:
   - **Region**: Choose closest to you (e.g., `London` or `Frankfurt`)
   - **OS Image**: `Ubuntu 22.04 (LTS) x64`
   - **Plan**: `Basic` → `$6/month` (512MB RAM / 1 CPU)
   - **SSH Key**: Select `musa-droplet-key`
   - **Hostname**: `musa-flw-proxy`
3. Click **"Create Droplet"**
4. **Copy the IP address** shown (e.g., `164.92.123.45`)

## Step 3: Update SSH Config

// turbo
Replace `YOUR_DROPLET_IP` in `~/.ssh/config` with your actual IP:
```bash
sed -i '' 's/YOUR_DROPLET_IP/164.92.123.45/g' ~/.ssh/config
```
(Replace `164.92.123.45` with your actual droplet IP)

## Step 4: SSH into Droplet

// turbo
```bash
ssh musa-droplet
```

## Step 5: Setup Server

Once inside the droplet, run:

// turbo
```bash
curl -fsSL https://raw.githubusercontent.com/yourusername/musa-app/main/flw-proxy/deploy.sh | bash
```

Or manually:

```bash
# Update system
sudo apt-get update -y && sudo apt-get upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Create app directory
sudo mkdir -p /var/www/flw-proxy
sudo chown -R $USER:$USER /var/www/flw-proxy
cd /var/www/flw-proxy

# Install express
npm install express
```

## Step 6: Upload Proxy Files

From your local machine (new terminal):

// turbo
```bash
cd /Users/kingtoy/Documents/Musa-App
scp -r flw-proxy/* musa-droplet:/var/www/flw-proxy/
```

## Step 7: Configure Environment

Back on the droplet:

```bash
cd /var/www/flw-proxy
nano .env
```

Add:
```
FLUTTERWAVE_SECRET_KEY=FLWSECK_test_xxxxxxxxxxx
PROXY_SECRET=your_random_secret_here_32_chars
PORT=8080
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

## Step 8: Start Proxy

// turbo
```bash
cd /var/www/flw-proxy
pm2 start index.js --name "flw-proxy"
pm2 save
pm2 startup
```

## Step 9: Get Static IP

// turbo
```bash
curl http://localhost:8080/verify-ip
```

This outputs your droplet's **public IP** - copy this for Flutterwave whitelist.

## Step 10: Whitelist IP in Flutterwave

1. Login to [Flutterwave Dashboard](https://dashboard.flutterwave.com)
2. Go to **Settings** → **API Keys**
3. Find **"IP Whitelist"** section
4. Add your droplet IP from Step 9
5. Click **Save**

## Step 11: Update Main App

In your Musa app `.env.local`:

```env
FLW_PROXY_URL=http://164.92.123.45:8080
FLW_PROXY_SECRET=your_random_secret_here_32_chars
```

## Useful Commands

```bash
# Check proxy status
ssh musa-droplet "pm2 status"

# View logs
ssh musa-droplet "pm2 logs flw-proxy"

# Restart proxy
ssh musa-droplet "pm2 restart flw-proxy"

# Check IP (for Flutterwave whitelist verification)
curl http://164.92.123.45:8080/verify-ip
```

## Troubleshooting

**Permission denied when SSH'ing:**
```bash
chmod 600 ~/.ssh/musa_droplet
```

**Proxy won't start:**
```bash
ssh musa-droplet
cd /var/www/flw-proxy
pm2 logs
```

**Firewall blocking:**
```bash
ssh musa-droplet
sudo ufw status
sudo ufw allow 8080/tcp
```
