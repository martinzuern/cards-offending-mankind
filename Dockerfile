#  _______                                   _ 
# (_______)              _                  | |
#  _____ ____ ___  ____ | |_  ____ ____   _ | |
# |  ___) ___) _ \|  _ \|  _)/ _  )  _ \ / || |
# | |  | |  | |_| | | | | |_( (/ /| | | ( (_| |
# |_|  |_|   \___/|_| |_|\___)____)_| |_|\____|
                                             
FROM node:12-alpine as build_frontent

# Trigger fallback to origin
ENV VUE_APP_BACKEND_URL=''

# Type folder needed for typescript compilation
WORKDIR /opt/types
ADD ./types .

WORKDIR /opt/frontend

# Dependencies
COPY ./frontend/package.json ./frontend/yarn.lock ./
RUN yarn --frozen-lockfile

# Build
ADD ./frontend .
RUN yarn build

# Add licenses
RUN mkdir -p ./dist/licenses
RUN yarn licenses generate-disclaimer > ./dist/licenses/frontend.txt

# Debug: List built files
RUN ls -laR ./dist



#  ______              _                    _ 
# (____  \            | |                  | |
#  ____)  ) ____  ____| |  _ ____ ____   _ | |
# |  __  ( / _  |/ ___) | / ) _  )  _ \ / || |
# | |__)  | ( | ( (___| |< ( (/ /| | | ( (_| |
# |______/ \_||_|\____)_| \_)____)_| |_|\____|
                                            
FROM node:12

# Type folder needed for typescript compilation
WORKDIR /opt/types
ADD ./types .

WORKDIR /opt/backend

# Dependencies
COPY ./backend/package.json ./backend/yarn.lock ./
RUN yarn --frozen-lockfile

# Build
ADD ./backend .
RUN yarn compile

# Inject frontend files
RUN rm -rf ./dist/backend/public/*
COPY --from=build_frontent /opt/frontend/dist ./dist/backend/public/

# Add licenses
RUN yarn licenses generate-disclaimer > ./dist/backend/public/licenses/backend.txt

RUN ls -laR ./dist

ENV NODE_ENV=production

CMD ["node", "dist/backend/server/index.js"]
