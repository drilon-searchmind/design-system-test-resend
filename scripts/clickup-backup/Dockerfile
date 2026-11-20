FROM node:22-slim
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY backup.mjs clickup-api.mjs bq-sink.mjs test-connection.mjs cleanup-test.mjs ./

# 8 GB heap: workspaceet har 30k+ tasks; uden det falder Node ved ~4 GB
ENV NODE_OPTIONS=--max-old-space-size=8192

# Railway-variabler injiceres som miljø (ingen --env-file). BACKUP_ARGS styrer tilstanden:
#   ikke sat    -> "--run" (rigtig backup)
#   sat til ""  -> tør kørsel
#   fx "--run --prefix=test_ --limit-folders=2 --limit-lists=2" -> lille test
CMD ["sh", "-c", "exec node backup.mjs ${BACKUP_ARGS---run} --auto-resume"]
