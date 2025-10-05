FROM node:18

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .

# Dev mode: npm run dev
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]