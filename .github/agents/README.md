# Project Agents - Development & Maintenance Team

This directory contains specialized AI agent definitions for the MCP Database Chat project. Each agent has a specific domain of expertise and collaborates with others to maintain and evolve the system.

## 🤖 Available Agents

### 1. Infrastructure Agent (`infrastructure.agent.md`)

**Role**: DevOps Specialist  
**Focus**: Docker orchestration, networking, volumes, deployment

**Use When**:

- Modifying docker-compose.yml
- Debugging container issues
- Managing environment variables
- Optimizing Docker builds
- Setting up health checks

**Key Responsibilities**:

- Manage all 5 services (frontend, mcp-server, mongodb, mysql, ollama)
- Configure networks and volumes
- Handle port mappings and conflicts
- Ensure service health and dependencies

---

### 2. MCP Server Agent (`mcp-server.agent.md`)

**Role**: Backend Integration Specialist  
**Focus**: MCP protocol, database tools, API endpoints

**Use When**:

- Adding new MCP tools
- Debugging tool execution
- Optimizing database queries
- Updating MCP SDK
- Adding input validation

**Key Responsibilities**:

- Maintain 14+ MCP tools (6 MongoDB + 8 MySQL)
- Manage HTTP and stdio servers
- Handle database connections
- Implement tool schemas with Zod

---

### 3. Database Agent (`database.agent.md`)

**Role**: Data Architecture Specialist  
**Focus**: Schema design, seed data, query optimization

**Use When**:

- Modifying database schemas
- Creating/updating seed data
- Adding indexes for performance
- Fixing data integrity issues
- Expanding sample data

**Key Responsibilities**:

- Maintain MongoDB (4 collections, ~200 docs)
- Maintain MySQL (8 tables, ~400+ records)
- Ensure data quality and consistency
- Optimize slow queries

---

### 4. Frontend Agent (`frontend.agent.md`)

**Role**: UI/UX Integration Specialist  
**Focus**: Next.js chat UI, LLM integration, user experience

**Use When**:

- Updating chat interface
- Adding new UI features
- Debugging LLM streaming
- Switching LLM providers
- Improving UX/accessibility

**Key Responsibilities**:

- Maintain Next.js 15 chat interface
- Manage Ollama integration via AI SDK
- Implement shadcn-ui components
- Handle tool calling from frontend

---

### 5. Documentation Agent (`documentation.agent.md`)

**Role**: Knowledge Management Specialist  
**Focus**: Guides, references, architecture docs, knowledge base

**Use When**:

- Documenting new features
- Updating guides after changes
- Creating troubleshooting procedures
- Maintaining architecture diagrams
- Writing onboarding materials

**Key Responsibilities**:

- Maintain README.md, QUICKSTART.md, copilot-instructions.md
- Document MCP tools with examples
- Keep schema documentation current
- Ensure docs match code

---

## 🤝 Agent Collaboration Model

```
┌─────────────────────────────────────────────────────────┐
│                  User Request/Issue                     │
└────────────────────┬────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │   Route to Agent(s)   │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┬─────────────┐
    │                │                │             │
┌───▼────┐    ┌─────▼──────┐   ┌────▼─────┐  ┌───▼────┐
│Infrast.│    │MCP Server  │   │Database  │  │Frontend│
└───┬────┘    └─────┬──────┘   └────┬─────┘  └───┬────┘
    │               │                │            │
    └───────────────┴────────────────┴────────────┘
                     │
              ┌──────▼──────┐
              │Documentation│
              │   Updates   │
              └─────────────┘
```

### Collaboration Examples

**Scenario: Add New MCP Tool**

1. **MCP Server Agent**: Implements tool logic and schema
2. **Database Agent**: Provides query patterns and validates data
3. **Frontend Agent**: Adds tool to API route tool definitions
4. **Documentation Agent**: Documents tool with examples
5. **Infrastructure Agent**: Ensures no env var changes needed

**Scenario: Schema Change**

1. **Database Agent**: Updates schema and seed data
2. **MCP Server Agent**: Adjusts tools to match new schema
3. **Infrastructure Agent**: Rebuilds database container
4. **Frontend Agent**: Updates UI if data shape changed
5. **Documentation Agent**: Updates schema docs and examples

**Scenario: Performance Issue**

1. **Infrastructure Agent**: Checks container resources
2. **Database Agent**: Analyzes slow queries, adds indexes
3. **MCP Server Agent**: Optimizes tool query logic
4. **Frontend Agent**: Adds loading indicators
5. **Documentation Agent**: Adds troubleshooting guide

---

## 📋 How to Use These Agents

### For Developers

1. **Identify the Domain**: Match your task to the appropriate agent
2. **Check Boundaries**: Ensure the agent handles that type of work
3. **Provide Context**: Give the agent all relevant information
4. **Review Collaboration**: Follow suggested handoffs to other agents

### For AI Assistants

When processing a request:

1. **Parse Intent**: Understand what the user wants to accomplish
2. **Select Agent**: Choose the most appropriate agent profile
3. **Apply Constraints**: Respect agent boundaries (what it won't do)
4. **Use Specified Tools**: Leverage the tools listed for that agent
5. **Coordinate**: Follow collaboration points for complex changes
6. **Report Progress**: Use the agent's reporting style

### Example Workflow

**User Request**: "Add a tool to search paints by supplier name"

**Agent Routing**:

- **Primary**: MCP Server Agent (implements the tool)
- **Supporting**: Database Agent (confirm suppliers schema)
- **Follow-up**: Documentation Agent (document new tool)

**Execution**:

1. MCP Server Agent creates `searchPaintsBySupplierTool`
2. Database Agent verifies supplier name field exists
3. MCP Server Agent tests tool with MCP Inspector
4. Documentation Agent adds tool to copilot-instructions.md
5. All agents report completion

---

## 🎯 Quick Reference

| Task Type            | Primary Agent  | Secondary Agent(s)         |
| -------------------- | -------------- | -------------------------- |
| Add Docker service   | Infrastructure | All (for env vars)         |
| New MCP tool         | MCP Server     | Database, Frontend, Docs   |
| Schema change        | Database       | MCP Server, Infrastructure |
| UI feature           | Frontend       | Documentation              |
| Performance tuning   | Database       | MCP Server, Infrastructure |
| LLM provider change  | Frontend       | Infrastructure (env), Docs |
| Troubleshooting      | Infrastructure | Relevant domain agent      |
| Documentation update | Documentation  | N/A                        |

---

## 📚 Additional Resources

- **Project Overview**: See `/README.md`
- **Architecture Details**: See `/.github/copilot-instructions.md`
- **Docker Guide**: See `/DOCKER-GUIDE.md`
- **Quick Start**: See `/QUICKSTART.md`

---

**Last Updated**: November 22, 2024  
**Agent Count**: 5 specialized roles  
**Collaboration Model**: Domain-driven with handoffs
