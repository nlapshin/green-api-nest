.PHONY: install dev build start test test-e2e docker-build docker-up docker-down lint

install:
	npm ci

dev:
	npm run start:dev

build:
	npm run build

start:
	npm run start:prod

test:
	npm test

test-e2e:
	npm run test:e2e

lint:
	npm run lint

docker-build:
	docker compose build

docker-up:
	docker compose up --build

docker-down:
	docker compose down
