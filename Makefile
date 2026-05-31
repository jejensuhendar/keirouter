# KeiRouter developer tasks.
#
# Common entrypoints:
#   make dev        run backend + frontend together (hot reload)
#   make backend    run only the Go backend
#   make frontend   run only the Vite dev server
#   make build      build backend binary + frontend assets
#   make test       run backend tests
#   make bootstrap  create an initial API key

BACKEND_DIR := backend
FRONTEND_DIR := frontend
BIN := keirouter

.PHONY: dev backend frontend build build-backend build-frontend test vet bootstrap install clean docker

## dev: run backend and frontend concurrently; Ctrl-C stops both.
dev:
	@echo "Starting KeiRouter backend (:20180) and dashboard (:5180)…"
	@trap 'kill 0' INT TERM EXIT; \
	( cd $(BACKEND_DIR) && go run ./cmd/keirouter ) & \
	( cd $(FRONTEND_DIR) && npm run dev ) & \
	wait

## backend: run only the Go backend.
backend:
	cd $(BACKEND_DIR) && go run ./cmd/keirouter

## frontend: run only the Vite dev server.
frontend:
	cd $(FRONTEND_DIR) && npm run dev

## install: install frontend dependencies and download Go modules.
install:
	cd $(FRONTEND_DIR) && npm install
	cd $(BACKEND_DIR) && go mod download

## build: build the backend binary and the frontend assets.
build: build-frontend build-backend

build-backend:
	cd $(BACKEND_DIR) && CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o ../$(BIN) ./cmd/keirouter

build-frontend:
	cd $(FRONTEND_DIR) && npm run build

## test: run the backend test suite.
test:
	cd $(BACKEND_DIR) && go test ./...

## vet: run static analysis.
vet:
	cd $(BACKEND_DIR) && go vet ./...

## bootstrap: create an initial API key (printed once).
bootstrap:
	cd $(BACKEND_DIR) && go run ./cmd/keirouter -bootstrap

## docker: build the production image.
docker:
	docker build -f deploy/Dockerfile -t keirouter:latest .

## clean: remove build artifacts.
clean:
	rm -f $(BIN)
	rm -rf $(FRONTEND_DIR)/dist