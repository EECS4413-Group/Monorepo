FROM node:19.3-slim


RUN apt update -qq

WORKDIR /app

# avoid npm installing every time
ADD package.json package.json
ADD package-lock.json package-lock.json
RUN npm install

ADD ./ ./
