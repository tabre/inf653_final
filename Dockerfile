FROM node:22

WORKDIR /app

COPY package*.json ./

RUN npm install
RUN npm install -g nodemon

COPY . .

EXPOSE 8000

CMD ["nodemon", "server.js"]
