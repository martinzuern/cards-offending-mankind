#  _______                                   _ 
# (_______)              _                  | |
#  _____ ____ ___  ____ | |_  ____ ____   _ | |
# |  ___) ___) _ \|  _ \|  _)/ _  )  _ \ / || |
# | |  | |  | |_| | | | | |_( (/ /| | | ( (_| |
# |_|  |_|   \___/|_| |_|\___)____)_| |_|\____|
                                             
FROM node:12-alpine as build_frontent

WORKDIR /opt/types
ADD ./types .

WORKDIR /opt/frontend
# Dependencies
COPY ./frontend/package.json ./frontend/yarn.lock ./
RUN yarn --frozen-lockfile
# Build
ADD ./frontend .
RUN yarn build
# Debug: List built files
RUN ls -laR ./dist



#  ______              _                    _ 
# (____  \            | |                  | |
#  ____)  ) ____  ____| |  _ ____ ____   _ | |
# |  __  ( / _  |/ ___) | / ) _  )  _ \ / || |
# | |__)  | ( | ( (___| |< ( (/ /| | | ( (_| |
# |______/ \_||_|\____)_| \_)____)_| |_|\____|
                                            
FROM node:12

WORKDIR /opt/types
ADD ./types .

WORKDIR /opt/backend
COPY ./backend/package.json ./backend/yarn.lock ./
RUN yarn --frozen-lockfile

ADD ./backend .

RUN yarn compile

RUN rm -rf ./dist/backend/public/*
COPY --from=build_frontent /opt/frontend/dist ./dist/backend/public/

RUN ls -laR ./dist

ENV NODE_ENV=production

CMD ["node", "dist/backend/server/index.js"]
