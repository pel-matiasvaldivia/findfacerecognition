# Stage 1: Build the React application
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Create React App inlines REACT_APP_* variables at BUILD time. They must be
# present here (not at container runtime) or the bundle ships with empty config.
# Values are provided as build args from CI (see .github/workflows/docker-build.yml).
ARG REACT_APP_GOOGLE_CLIENT_ID
ARG REACT_APP_API_URL=https://back.faceid.alertasenlinea.com.ar/api
ENV REACT_APP_GOOGLE_CLIENT_ID=$REACT_APP_GOOGLE_CLIENT_ID
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
