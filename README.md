# Alerts Poll Bot

## Overview

Alerts Poll Bot is a WhatsApp automation tool that monitors Pikud HaOref (Israel's Home Front Command) alerts for your specified city and automatically sends polls to designated WhatsApp group chats when alerts are detected. This allows quick coordination and status checks during emergency situations.

## Features

- 🚨 **Real-time Alert Monitoring**: Constantly checks for new alerts in your configured city
- 📊 **Automated Polls**: Sends polls to designated WhatsApp groups
- 🔄 **Smart Throttling**: Configurable cooldown periods prevent poll spam
- 🔌 **Simple Activation**: Easily activate or deactivate in any group with simple commands
- 🐳 **Docker Support**: Run in a containerized environment for improved reliability

## Prerequisites

- Node.js v22.14.0
- npm v10.9.2
- WhatsApp account for the bot
- Internet connection to access Pikud HaOref alert APIs

## Installation

### Local Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/ofir-paz/alerts-poll-bot.git
   cd alerts-poll-bot
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a .env file in the root directory with your settings:
   ```
   CITY_NAME=פתח תקווה  # Replace with your city name
   AUTH_FOLDER=auth_info
   ALERT_CHECK_INTERVAL_MS=15000
   POLL_INTERVAL_MINUTES=15
   ON_GROUP_MARKER=alerts-poll-bot-on
   OFF_GROUP_MARKER=alerts-poll-bot-off
   ```

4. Create the auth folder:
    ```bash
    mkdir -p auth_info
    ```

4. Start the application:
   ```bash
   node src/index.js
   ```

5. Scan the QR code with your WhatsApp to authenticate the bot.

### Docker Installation

1. Clone the repository and navigate to it:
   ```bash
   git clone <repository-url>
   cd alerts-poll-bot
   ```

2. Create the .env file as described above.

3. Build and start the Docker container:
   ```bash
   docker-compose up -d
   ```

4. View the logs to scan the QR code:
   ```bash
   docker-compose logs -f
   ```

5. Scan the QR code with your WhatsApp.

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| CITY_NAME | The city to monitor for alerts - note that the city name must be written the same way as it is written in Pikud HaOref (Hebrew words with spaces between them) | (Required) |
| AUTH_FOLDER | Path to store WhatsApp authentication data | auth_info |
| ALERT_CHECK_INTERVAL_MS | Milliseconds between alert checks | 15000 |
| POLL_INTERVAL_MINUTES | Minimum minutes between polls to prevent spam | 15 |
| ON_GROUP_MARKER | Message to activate the bot in a group | alerts-poll-bot-on |
| OFF_GROUP_MARKER | Message to deactivate the bot in a group | alerts-poll-bot-off |

### Poll Settings

The poll question and options are currently hardcoded in the application:
- Poll question: "האם כולם באיזור בטוח?" (Is everyone in a safe area?)
- Poll options: "כן" (Yes), "בדרך" (On the way), "לא" (No)

## Usage

### Activating in WhatsApp Groups

1. Add the bot's phone number to the WhatsApp group.
2. Send the activation message (default: `alerts-poll-bot-on`) in the group.
3. The bot will confirm activation and start monitoring alerts for this group.

**Note**: If you run this in linux, note that Hebrew text will be displayed backwards in the logs. This does not affect functionality.

### Deactivating

1. Send the deactivation message (default: `alerts-poll-bot-off`) in the group.
2. The bot will confirm deactivation and stop sending polls to this group.

### When Alerts Occur

- The bot automatically detects alerts for your configured city.
- If an alert is detected, a poll is sent to all activated groups.
- Users can respond to the poll to indicate their status.
- Polls are throttled according to the POLL_INTERVAL_MINUTES setting.

## Development

This project uses:
- `@whiskeysockets/baileys` for WhatsApp communication
- `dayjs` for time manipulation
- `dotenv` for environment variable management

### Setting up the Development Environment

```bash
# Install nvm if you don't have it
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Install and use the required Node.js version
nvm install 22.14.0
nvm use 22.14.0

# Update npm to the required version
npm install -g npm@10.9.2

# Install dependencies
npm install
```

## Docker Management

### Starting the Container
```bash
docker-compose up -d
```

### Viewing Logs
```bash
docker-compose logs -f
```

### Stopping the Container
```bash
docker-compose down
```

### Rebuilding after Changes
```bash
docker-compose build --no-cache
docker-compose up -d
```

## Future Development

Potential features for future versions:

1. **Urgent**: Fix package vulnerabilities errors and deprecations (IDK how to do this). During development on Windows 11 there were no such warnings but when deploying in Linux, those warnings appeared.
1. **Customizable Polls**: Allow poll questions and options to be configured through the marker, allowing users to customize the poll for each group.
2. **Multiple City Monitoring**: Support monitoring alerts for multiple cities simultaneously, or different cities for different groups.
3. **Response Analytics**: Collect and analyze poll responses for better coordination.

## License

This project is licensed under the MIT License.

## Disclaimer

This tool is intended for emergency coordination purposes. Please use responsibly and ensure you have proper permissions to operate automated bots on WhatsApp according to their terms of service.