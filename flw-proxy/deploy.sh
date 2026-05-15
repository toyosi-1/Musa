#!/bin/bash
# DigitalOcean Droplet Setup Script for Flutterwave Proxy
# This script sets up the server with Node.js, PM2, and the proxy service

set -e

echo "🚀 Setting up Flutterwave Proxy Server..."

# Update system
echo "📦 Updating system packages..."
sudo apt-get update -y
sudo apt-get upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Create app directory
echo "📁 Creating app directory..."
sudo mkdir -p /var/www/flw-proxy
sudo chown -R $USER:$USER /var/www/flw-proxy

# Install dependencies
echo "📦 Installing dependencies..."
cd /var/www/flw-proxy
npm install express

# Setup PM2 to run the proxy
echo "🔧 Configuring PM2..."
pm2 start index.js --name "flw-proxy" -- --port 8080
pm2 startup systemd
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
pm2 save

# Install and configure UFW firewall
echo "🔒 Setting up firewall..."
sudo apt-get install -y ufw
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 8080/tcp
sudo ufw --force enable

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in /var/www/flw-proxy/.env"
echo "2. Restart the service: pm2 restart flw-proxy"
echo "3. Check status: pm2 status"
echo ""
echo "Your server IP will be shown below:"
curl -s https://api.ipify.org
echo ""
