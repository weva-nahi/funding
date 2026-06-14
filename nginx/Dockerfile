FROM nginx:1.27-alpine

RUN rm /etc/nginx/conf.d/default.conf

COPY proxy_common.conf /etc/nginx/proxy_common.conf
COPY prod.conf /etc/nginx/conf.d/prod.conf

RUN mkdir -p /var/www/certbot

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]