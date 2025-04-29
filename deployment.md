# INSEAT Customer Application Deployment Guide

This document outlines the complete deployment process for the INSEAT customer application.

## Initial Deployment

### 1. Clone the Repository
```bash
# Navigate to your project directory
cd /home/administrator/Desktop/Project

# Clone using SSH (requires SSH key setup with GitHub)
git clone git@github.com:Achievengine/INSEAT-customer.git inseat-customer
cd inseat-customer
```

### 2. Install Dependencies and Build
```bash
# Install all dependencies (including axios which is required)
npm install
npm install axios  # If not included in package.json

# Build the application
npm run build
```

### 3. Deploy to Web Server
```bash
# Create directory if it doesn't exist
sudo mkdir -p /var/www/inseat-customer

# Copy built files
sudo cp -r dist/* /var/www/inseat-customer/

# Set proper ownership
sudo chown -R www-data:www-data /var/www/inseat-customer
```

### 4. Caddy Server Configuration
```bash
# Backup existing Caddyfile
sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup

# Add new server block to Caddyfile
sudo vim /etc/caddy/Caddyfile

# Add the following configuration:
menu.inseat.achievengine.com {
    root * /var/www/inseat-customer
    encode gzip
    try_files {path} /index.html
    
    log {
        output file /var/log/caddy/inseat-customer.log
    }
    
    file_server
}

# Reload Caddy
sudo systemctl reload caddy
```

## Updating the Application

When updates are needed, follow these steps:

1. Navigate to the project directory:
```bash
cd /home/administrator/Desktop/Project/inseat-customer
```

2. Pull the latest changes:
```bash
git pull origin main  # or your deployment branch
```

3. Install dependencies (if package.json changed):
```bash
npm install
```

4. Build the application:
```bash
npm run build
```

5. Deploy updates:
```bash
sudo cp -r dist/* /var/www/inseat-customer/
sudo chown -R www-data:www-data /var/www/inseat-customer
```

## Verification

After deployment or updates:
1. Visit https://menu.inseat.achievengine.com
2. Verify that all routes work correctly
3. Check logs for any errors:
```bash
tail -f /var/log/caddy/inseat-customer.log
```

## Troubleshooting

### Common Issues and Solutions:

1. If Caddy fails to reload:
```bash
# Check Caddy status
sudo systemctl status caddy
# Check Caddy logs
journalctl -u caddy
```

2. If the application is not accessible:
- Verify the domain DNS settings
- Check firewall rules
- Ensure Caddy is running
- Verify file permissions in /var/www/inseat-customer

3. If build fails:
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and package-lock.json
- Run `npm install` again

### Rollback Procedure

If you need to rollback the Caddy configuration:
```bash
sudo cp /etc/caddy/Caddyfile.backup /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Security Notes

- Always maintain proper file permissions
- Keep npm packages updated
- Regularly check for security updates
- Monitor application logs for suspicious activity
