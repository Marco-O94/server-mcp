# Makefile per Multi-DB MCP Project
# Alternative comoda ai comandi docker-compose

.PHONY: help start stop restart logs status health build clean reset-db mongo mysql

# Colors
GREEN  := $(shell tput -Txterm setaf 2)
YELLOW := $(shell tput -Txterm setaf 3)
RESET  := $(shell tput -Txterm sgr0)

help: ## Mostra questo messaggio di aiuto
	@echo '${GREEN}Multi-DB MCP Project - Makefile Commands${RESET}'
	@echo ''
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  ${GREEN}%-15s${RESET} %s\n", $$1, $$2}'
	@echo ''

start: ## Avvia tutti i servizi
	@echo '${GREEN}Starting all services...${RESET}'
	@docker-compose up -d
	@echo '${GREEN}Services started!${RESET}'

stop: ## Ferma tutti i servizi
	@echo '${YELLOW}Stopping all services...${RESET}'
	@docker-compose down
	@echo '${GREEN}Services stopped!${RESET}'

restart: ## Riavvia tutti i servizi
	@echo '${YELLOW}Restarting all services...${RESET}'
	@docker-compose restart
	@echo '${GREEN}Services restarted!${RESET}'

logs: ## Visualizza i log di tutti i servizi (Ctrl+C per uscire)
	@docker-compose logs -f

logs-frontend: ## Visualizza i log del frontend
	@docker-compose logs -f frontend

logs-mcp: ## Visualizza i log del MCP server
	@docker-compose logs -f mcp-server

logs-mongo: ## Visualizza i log di MongoDB
	@docker-compose logs -f mongodb

logs-mysql: ## Visualizza i log di MySQL
	@docker-compose logs -f mysql

logs-ollama: ## Visualizza i log di Ollama
	@docker-compose logs -f ollama

status: ## Mostra lo stato di tutti i servizi
	@docker-compose ps

health: ## Verifica la salute di tutti i servizi
	@./docker-utils.sh health

build: ## Rebuilda tutti i servizi
	@echo '${YELLOW}Building all services...${RESET}'
	@docker-compose build --no-cache
	@echo '${GREEN}Build complete!${RESET}'

clean: ## Rimuove tutti i container, volumi e network (ATTENZIONE!)
	@echo '${YELLOW}This will remove all containers, volumes and networks!${RESET}'
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v --remove-orphans; \
		echo '${GREEN}Cleanup complete!${RESET}'; \
	else \
		echo '${YELLOW}Operation cancelled${RESET}'; \
	fi

reset-db: ## Reset dei database (cancella tutti i dati!)
	@./docker-utils.sh reset-db

mongo: ## Apri shell MongoDB
	@docker-compose exec mongodb mongosh -u admin -p mongopassword --authenticationDatabase admin paints_db

mysql: ## Apri shell MySQL
	@docker-compose exec mysql mysql -u root -pmysqlrootpassword food_industry

pull-llama2: ## Scarica il modello Llama2 per Ollama
	@docker-compose exec ollama ollama pull llama2

pull-mistral: ## Scarica il modello Mistral per Ollama
	@docker-compose exec ollama ollama pull mistral

pull-codellama: ## Scarica il modello CodeLlama per Ollama
	@docker-compose exec ollama ollama pull codellama

list-models: ## Lista i modelli Ollama disponibili
	@docker-compose exec ollama ollama list

dev: start ## Alias per 'start' - avvia ambiente di sviluppo
	@echo '${GREEN}Development environment ready!${RESET}'
	@echo '${GREEN}Frontend: http://localhost:3000${RESET}'
	@echo '${GREEN}MCP Server: http://localhost:8080${RESET}'

init: ## Setup iniziale del progetto
	@if [ ! -f .env ]; then \
		echo '${YELLOW}Creating .env file from .env.example...${RESET}'; \
		cp .env.example .env; \
		echo '${GREEN}.env file created!${RESET}'; \
	else \
		echo '${YELLOW}.env file already exists${RESET}'; \
	fi
	@echo '${GREEN}Starting services...${RESET}'
	@$(MAKE) start
	@echo '${GREEN}Pulling Llama2 model...${RESET}'
	@sleep 10
	@$(MAKE) pull-llama2
	@echo '${GREEN}Setup complete!${RESET}'

ps: status ## Alias per 'status'

up: start ## Alias per 'start'

down: stop ## Alias per 'stop'
