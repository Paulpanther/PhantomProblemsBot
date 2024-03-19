FROM node:alpine

ENV TOKEN=''
ENV DATABASE_URL=file:./dev.db

COPY package.json .
RUN npm install

COPY . .
RUN npm run create-db
EXPOSE 80
CMD ["npm", "run", "start"]