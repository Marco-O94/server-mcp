# Quick Reference - Docker Commands

## 🚀 Start/Stop

```bash
# Start (multiple options)
./docker-utils.sh start
make start
docker-compose up -d

# Stop
./docker-utils.sh stop
make stop
docker-compose down

# Restart
./docker-utils.sh restart
make restart
docker-compose restart
```

## 📊 Monitoring

```bash
# Status
./docker-utils.sh status
make status
docker-compose ps

# Health check
./docker-utils.sh health
make health

# Logs (all services)
./docker-utils.sh logs
make logs
docker-compose logs -f

# Logs (specific service)
./docker-utils.sh logs frontend
make logs-frontend
docker-compose logs -f frontend
```

## 🗄️ Database Access

```bash
# MongoDB shell
./docker-utils.sh mongo-shell
make mongo
docker-compose exec mongodb mongosh -u admin -p mongopassword --authenticationDatabase admin paints_db

# MySQL shell
./docker-utils.sh mysql-shell
make mysql
docker-compose exec mysql mysql -u root -pmysqlrootpassword food_industry

# Reset databases (WARNING: deletes data!)
./docker-utils.sh reset-db
make reset-db
```

## 🤖 Ollama LLM

```bash
# Pull models
./docker-utils.sh pull-model llama2
make pull-llama2

./docker-utils.sh pull-model mistral
make pull-mistral

./docker-utils.sh pull-model codellama
make pull-codellama

# List models
./docker-utils.sh list-models
make list-models
docker-compose exec ollama ollama list

# Run a model interactively
docker-compose exec ollama ollama run mistral

# Reset Ollama (removes all models)
./docker-utils.sh reset-ollama
```

## 🔨 Build & Development

```bash
# Build all services
./docker-utils.sh build
make build
docker-compose build

# Rebuild specific service
docker-compose build mcp-server
docker-compose build frontend

# Clean everything (WARNING!)
./docker-utils.sh clean
make clean
docker-compose down -v --remove-orphans
```

## 🔍 Debugging

```bash
# Enter container shell
docker-compose exec mongodb bash
docker-compose exec mysql bash
docker-compose exec mcp-server sh
docker-compose exec frontend sh
docker-compose exec ollama bash

# Inspect container
docker inspect paints-mongodb
docker inspect food-mysql
docker inspect mcp-server
docker inspect ollama-llm

# View container processes
docker-compose top

# View resource usage
docker stats
```

## 📦 Volumes

```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect db-mcp_mongodb_data
docker volume inspect db-mcp_mysql_data
docker volume inspect db-mcp_ollama_data

# Backup volume (example for MongoDB)
docker run --rm -v db-mcp_mongodb_data:/data -v $(pwd):/backup ubuntu tar czf /backup/mongodb-backup.tar.gz /data

# Remove volumes (WARNING!)
docker volume rm db-mcp_mongodb_data
docker volume rm db-mcp_mysql_data
docker volume rm db-mcp_ollama_data
```

## 🌐 Network

```bash
# Inspect network
docker network inspect db-mcp_app-network

# List networks
docker network ls

# Test connectivity between containers
docker-compose exec mongodb ping mysql
docker-compose exec mysql ping mongodb
docker-compose exec mcp-server ping mongodb
```

## 🧪 Testing

```bash
# Test MongoDB
docker-compose exec mongodb mongosh --eval "db.runCommand({ ping: 1 })"

# Test MySQL
docker-compose exec mysql mysqladmin ping -h localhost -u root -pmysqlrootpassword

# Test MCP Server
curl http://localhost:8080/health

# Test Frontend
curl http://localhost:3000

# Test Ollama
curl http://localhost:11434/api/tags
```

## 📝 Database Queries

```bash
# MongoDB - Count documents
docker-compose exec mongodb mongosh -u admin -p mongopassword --authenticationDatabase admin paints_db --eval "db.products.countDocuments()"

# MongoDB - Find products
docker-compose exec mongodb mongosh -u admin -p mongopassword --authenticationDatabase admin paints_db --eval "db.products.find().limit(5).pretty()"

# MySQL - Count rows
docker-compose exec mysql mysql -u root -pmysqlrootpassword food_industry -e "SELECT COUNT(*) FROM products;"

# MySQL - Show data
docker-compose exec mysql mysql -u root -pmysqlrootpassword food_industry -e "SELECT * FROM products LIMIT 5;"
```

## ⚙️ Configuration

```bash
# Validate docker-compose.yml
docker-compose config

# View environment variables
docker-compose config | grep -A 20 "environment:"

# Validate specific service config
docker-compose config --services
```

## 🔐 Security

```bash
# Scan for vulnerabilities
docker scan paints-mongodb
docker scan food-mysql

# View image history
docker history mongo:7.0
docker history mysql:8.0
```

## 🎯 One-liners

```bash
# Complete reset (stops everything, removes all data)
docker-compose down -v && docker-compose up -d

# Rebuild and restart specific service
docker-compose up -d --build mcp-server

# View last 100 lines of logs
docker-compose logs --tail=100 -f

# Remove all stopped containers
docker container prune -f

# Remove unused images
docker image prune -a -f

# Remove everything Docker related (NUCLEAR!)
docker system prune -a --volumes -f
```

## 🚀 Initial Setup

```bash
# Complete first-time setup
make init
# This will:
# - Create .env from .env.example
# - Start all services
# - Pull llama2 model

# Or manual:
cp .env.example .env
./docker-utils.sh start
./docker-utils.sh pull-model llama2
```

## 🆘 Emergency

```bash
# Stop everything immediately
docker-compose kill

# Remove everything and start fresh
docker-compose down -v
docker-compose up -d

# Check disk space
docker system df

# Free up space
docker system prune --volumes -f
```

## 📱 Service URLs

- Frontend: http://localhost:3000
- MCP Server: http://localhost:8080
- MCP Health: http://localhost:8080/health
- Ollama API: http://localhost:11434
- Ollama Tags: http://localhost:11434/api/tags
- MongoDB: mongodb://admin:mongopassword@localhost:27017/paints_db?authSource=admin
- MySQL: mysql://fooduser:foodpassword@localhost:3306/food_industry

## 🔄 Common Workflows

### Daily Development

```bash
make start              # Start services
make logs-mcp          # Watch MCP server logs
# Make code changes (auto-reload enabled)
make restart           # Restart if needed
```

### Database Development

```bash
make mongo             # Work with MongoDB
make mysql             # Work with MySQL
make reset-db          # Reset if schema changes
```

### LLM Development

```bash
make pull-llama2       # Get LLM model
make list-models       # Check available models
# Test in frontend at localhost:3000
```

### Troubleshooting

```bash
make health            # Check all services
make logs              # View all logs
make status            # Check running containers
docker stats           # Check resource usage
```

---

**Tip**: Add aliases to your `.zshrc` or `.bashrc`:

```bash
alias dcu='docker-compose up -d'
alias dcd='docker-compose down'
alias dcl='docker-compose logs -f'
alias dcp='docker-compose ps'
```
