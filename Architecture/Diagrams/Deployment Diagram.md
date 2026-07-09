# Deployment Diagram

Parent: [[Architecture Overview]] · [[Deployment/Deployment Overview|Deployment Overview]]

```mermaid
flowchart TD
    Internet["Internet / internal network"]
    Proxy["Reverse proxy (nginx / Caddy / enterprise LB)<br/>TLS termination"]
    App["ConfigFoundry process<br/>python3 server.py / run_offline.sh<br/>port 8420 default"]
    DB["Database<br/>SQLite file, or PostgreSQL/MySQL/SQL Server"]
    DD["Datadog Agent<br/>(optional, DD_AGENT_HOST)"]

    Internet --> Proxy
    Proxy -->|HTTP, localhost/internal only| App
    App --> DB
    App -.APM traces/profiles/logs, if configured.-> DD
```

Single-process topology: one ConfigFoundry instance per team/environment, no built-in load balancer, message queue, or worker pool. Multi-instance is possible only with a shared PostgreSQL backend and is not validated end-to-end for SQLite. See [[Deployment/Production Deployment|Production Deployment]] and [[Deployment/Deployment Overview#Zero-downtime notes|Deployment Overview § Zero-downtime notes]].

There is no Dockerfile or container image in this repository today — deployment is a bare-metal/VM process under a supervisor (systemd example in [[Deployment/Production Deployment|Production Deployment]]). See [[Development/Technical Debt|Technical Debt]].
