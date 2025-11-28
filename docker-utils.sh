#!/bin/bash

# Docker Utilities per il progetto Multi-DB MCP
# Questo script fornisce comandi utili per gestire l'infrastruttura Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if .env exists, if not copy from .env.example
check_env() {
    if [ ! -f .env ]; then
        echo_warn ".env file not found"
        if [ -f .env.example ]; then
            echo_info "Copying .env.example to .env"
            cp .env.example .env
            echo_info "Please review and update .env file with your configurations"
        else
            echo_error ".env.example not found. Cannot proceed."
            exit 1
        fi
    fi
}

# Start all services
start() {
    echo_info "Starting all services..."
    check_env
    docker-compose up -d
    echo_info "Services started. Use 'docker-compose logs -f' to view logs"
}

# Stop all services
stop() {
    echo_info "Stopping all services..."
    docker-compose down
    echo_info "Services stopped"
}

# Restart all services
restart() {
    echo_info "Restarting all services..."
    docker-compose restart
    echo_info "Services restarted"
}

# View logs
logs() {
    if [ -z "$1" ]; then
        docker-compose logs -f
    else
        docker-compose logs -f "$1"
    fi
}

# Check status of services
status() {
    echo_info "Service status:"
    docker-compose ps
}

# Reset databases (WARNING: deletes all data)
reset_db() {
    echo_warn "This will DELETE all database data!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        echo_info "Stopping services..."
        docker-compose down
        echo_info "Removing database volumes..."
        docker volume rm db-mcp_mongodb_data db-mcp_mysql_data 2>/dev/null || true
        echo_info "Starting services (databases will be reinitialized)..."
        docker-compose up -d mongodb mysql
        echo_info "Databases reset complete"
    else
        echo_info "Operation cancelled"
    fi
}

# Reset Ollama data
reset_ollama() {
    echo_warn "This will DELETE all Ollama models and data!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        echo_info "Stopping Ollama..."
        docker-compose stop ollama
        echo_info "Removing Ollama volume..."
        docker volume rm db-mcp_ollama_data 2>/dev/null || true
        echo_info "Starting Ollama..."
        docker-compose up -d ollama
        echo_info "Ollama reset complete"
    else
        echo_info "Operation cancelled"
    fi
}

# Pull Ollama model
pull_model() {
    if [ -z "$1" ]; then
        echo_error "Please specify a model name (e.g., llama2, mistral, codellama)"
        exit 1
    fi
    echo_info "Pulling Ollama model: $1"
    docker-compose exec ollama ollama pull "$1"
    echo_info "Model $1 pulled successfully"
}

# List Ollama models
list_models() {
    echo_info "Available Ollama models:"
    docker-compose exec ollama ollama list
}

# Execute MongoDB shell
mongo_shell() {
    echo_info "Connecting to MongoDB shell..."
    docker-compose exec mongodb mongosh -u admin -p mongopassword --authenticationDatabase admin paints_db
}

# Execute MySQL shell
mysql_shell() {
    echo_info "Connecting to MySQL shell..."
    docker-compose exec mysql mysql -u root -pmysqlrootpassword food_industry
}

# Build all services
build() {
    echo_info "Building all services..."
    docker-compose build --no-cache
    echo_info "Build complete"
}

# Clean up everything (containers, volumes, networks)
clean() {
    echo_warn "This will REMOVE all containers, volumes, and networks!"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" = "yes" ]; then
        echo_info "Cleaning up..."
        docker-compose down -v --remove-orphans
        echo_info "Cleanup complete"
    else
        echo_info "Operation cancelled"
    fi
}

# Health check
health() {
    echo_info "Checking service health..."
    echo ""
    echo "MongoDB:"
    docker-compose exec mongodb mongosh --eval "db.runCommand('ping')" --quiet 2>/dev/null && echo_info "✓ MongoDB is healthy" || echo_error "✗ MongoDB is unhealthy"
    
    echo ""
    echo "MySQL:"
    docker-compose exec mysql mysqladmin ping -h localhost -u root -pmysqlrootpassword --silent 2>/dev/null && echo_info "✓ MySQL is healthy" || echo_error "✗ MySQL is unhealthy"
    
    echo ""
    echo "MCP Server:"
    curl -f http://localhost:8080/health -s > /dev/null 2>&1 && echo_info "✓ MCP Server is healthy" || echo_error "✗ MCP Server is unhealthy"
    
    echo ""
    echo "Frontend:"
    curl -f http://localhost:3000 -s > /dev/null 2>&1 && echo_info "✓ Frontend is healthy" || echo_error "✗ Frontend is unhealthy"
    
    echo ""
    echo "Ollama:"
    curl -f http://localhost:11434/api/tags -s > /dev/null 2>&1 && echo_info "✓ Ollama is healthy" || echo_error "✗ Ollama is unhealthy"
}

# Show help
help() {
    cat << EOF
Docker Utilities for Multi-DB MCP Project

Usage: ./docker-utils.sh [command] [options]

Commands:
  start              Start all services
  stop               Stop all services
  restart            Restart all services
  logs [service]     View logs (optionally for specific service)
  status             Show service status
  build              Build all services
  health             Check health of all services
  
  reset-db           Reset databases (deletes all data!)
  reset-ollama       Reset Ollama (deletes all models!)
  
  pull-model <name>  Pull an Ollama model (e.g., llama2, mistral)
  list-models        List available Ollama models
  
  mongo-shell        Open MongoDB shell
  mysql-shell        Open MySQL shell
  
  clean              Remove all containers, volumes, and networks
  help               Show this help message

Examples:
  ./docker-utils.sh start
  ./docker-utils.sh logs frontend
  ./docker-utils.sh pull-model llama2
  ./docker-utils.sh mongo-shell

EOF
}

# Main script logic
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    logs)
        logs "$2"
        ;;
    status)
        status
        ;;
    reset-db)
        reset_db
        ;;
    reset-ollama)
        reset_ollama
        ;;
    pull-model)
        pull_model "$2"
        ;;
    list-models)
        list_models
        ;;
    mongo-shell)
        mongo_shell
        ;;
    mysql-shell)
        mysql_shell
        ;;
    build)
        build
        ;;
    clean)
        clean
        ;;
    health)
        health
        ;;
    help|--help|-h|"")
        help
        ;;
    *)
        echo_error "Unknown command: $1"
        echo ""
        help
        exit 1
        ;;
esac
