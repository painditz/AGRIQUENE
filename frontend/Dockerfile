FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy application source
COPY . .

# Build application
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
