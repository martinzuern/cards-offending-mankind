######################################################
#   ___                      _                     _ 
#  | __|  _ _   ___   _ _   | |_   ___   _ _    __| |
#  | _|  | '_| / _ \ | ' \  |  _| / -_) | ' \  / _` |
#  |_|   |_|   \___/ |_||_|  \__| \___| |_||_| \__,_|
###################### Frontend ######################                                                  

FROM node:12 as build_frontent

ARG COMMIT_SHA='unkown'
ENV VUE_APP_SHA=$COMMIT_SHA

ARG FRONTEND_SENTRY_DSN=''
ENV VUE_APP_FRONTEND_SENTRY_DSN=$FRONTEND_SENTRY_DSN

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
RUN yarn licenses generate-disclaimer --silent --production > ./dist/licenses/frontend.txt

# Debug: List built files
RUN ls -laR ./dist


###############################################
#   ___               _                     _ 
#  | _ )  __ _   __  | |__  ___   _ _    __| |
#  | _ \ / _` | / _| | / / / -_) | ' \  / _` |
#  |___/ \__,_| \__| |_\_\ \___| |_||_| \__,_|
################### Backend ###################

FROM node:12 as build_backend

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

# Add licenses
RUN mkdir -p ./licenses
RUN yarn licenses generate-disclaimer --silent --production > ./licenses/backend.txt

# Debug: List built files
RUN ls -laR ./dist


#############################################################
#   ___   _                 _     ___          _   _      _ 
#  | __| (_)  _ _    __ _  | |   | _ )  _  _  (_) | |  __| |
#  | _|  | | | ' \  / _` | | |   | _ \ | || | | | | | / _` |
#  |_|   |_| |_||_| \__,_| |_|   |___/  \_,_| |_| |_| \__,_|
######################## Final Build ########################

FROM node:12

ARG COMMIT_SHA='unkown'
ENV SHA=$COMMIT_SHA

ENV NODE_ENV=production

WORKDIR /opt/app

COPY ./backend/package.json ./backend/yarn.lock ./
RUN yarn --frozen-lockfile

# Inject backend files
COPY --from=build_backend /opt/backend/dist .
RUN cp ./backend/server/.env .

# Inject frontend files
RUN rm -rf ./backend/public/*
COPY --from=build_frontent /opt/frontend/dist ./backend/public/
COPY --from=build_backend /opt/backend/licenses/* ./backend/public/licenses

# Debug: List built files
RUN ls -laR .

CMD ["node", "backend/server/index.js"]
