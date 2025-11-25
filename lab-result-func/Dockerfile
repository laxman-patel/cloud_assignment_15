# Build Stage
FROM oven/bun:1 as builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# Build TypeScript to JavaScript
RUN bun build index.ts --outfile=index.js --target=node

# Runtime Stage
FROM public.ecr.aws/lambda/nodejs:18

WORKDIR ${LAMBDA_TASK_ROOT}

COPY --from=builder /app/index.js .
# If you have runtime dependencies that are not bundled, copy node_modules or install them here.
# Since we used bun build, it might bundle dependencies if we configured it, 
# but default bun build might not bundle node_modules for node target without --compile or similar?
# Actually, for Lambda, it's safer to copy package.json and install production deps if not bundling.
# But let's assume for now we just copy the built file. 
# To be safe with dependencies like pdf-parse, we should probably install them in the runtime stage.

COPY package.json ./
RUN npm install --omit=dev

CMD ["index.handler"]
