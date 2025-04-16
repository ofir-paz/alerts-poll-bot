FROM node:22.14.0-slim

# Create app directory
WORKDIR /app

# Verify and update npm to the required version
RUN npm install -g npm@10.9.2

# Verify versions
RUN node --version && npm --version

# Install dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY src/ ./src/
COPY .env ./

# Create directory for WhatsApp auth info
RUN mkdir -p auth_info

# Start the application
CMD [ "node", "src/index.js" ]