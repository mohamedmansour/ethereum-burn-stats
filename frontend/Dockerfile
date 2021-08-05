FROM node:16

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]
RUN npm install --production
COPY . .
RUN npm run build && npm install -g serve

CMD [ "serve", "-s", "build", "-l", "3000" ]
