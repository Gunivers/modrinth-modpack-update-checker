FROM denoland/deno:latest as base

WORKDIR /app

COPY . ./

RUN deno cache main.ts

CMD ["run", "--allow-net", "--allow-env", "main.ts"]